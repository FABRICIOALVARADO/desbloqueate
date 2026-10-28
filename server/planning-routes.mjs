import {randomUUID} from 'node:crypto';
import {rankedTasks,buildPlan,validateWindow,overlaps} from '../src/app/domain/planning.ts';
import {aiConfig,generateAdvice} from './ai-provider.mjs';
import {readBusy,ensureStudyCalendar,publishBlock} from './calendar-service.mjs';
export function registerPlanning(app,{db,auth,calendarClient,taskOut,courses}){
 const {all,one,run}=db,locks=new Set(),aiLocks=new Set(),requests=new Map();
 app.use(['/api/study','/api/calendar/availability'],auth,(req,res,next)=>{
  if(req.method==='GET')return next();const now=Date.now();
  for(const [id,v] of requests)if(v.until<now)requests.delete(id);
  const r=requests.get(req.user.id)||{n:0,until:now+60000};r.n++;requests.set(req.user.id,r);
  if(r.n>30)return res.status(429).json({error:'Demasiadas solicitudes. Espera un minuto y vuelve a intentar.'});next();
 });
 const tasksFor=async uid=>Promise.all((await all('SELECT * FROM tasks WHERE user_id=?',uid)).map(taskOut));
 const blocksFor=async uid=>(await all('SELECT * FROM study_blocks WHERE user_id=? ORDER BY start_at',uid)).map(b=>({...b,start:b.start_at,end:b.end_at}));
 app.get('/api/ai/status',auth,(_req,res)=>{const {enabled,provider,privacy}=aiConfig();res.json({enabled,provider,privacy});});
 app.get('/api/study/blocks',auth,async(req,res)=>res.json(await blocksFor(req.user.id)));
 app.post('/api/study/propose',auth,async(req,res)=>{
  const {start,end,useAI=false,consent=false,useCalendar=false,calendarConsent=false,action='organize',request=''}=req.body;
  if(!['recommend','start','organize','reorganize'].includes(action)||typeof request!=='string'||request.length>500)throw Error('Solicitud de organización inválida.');
  const window=validateWindow(start,end),now=Date.now();
  if(useAI&&consent!==true)return res.status(403).json({error:'Autoriza el uso de contexto académico antes de enviarlo a la IA.'});
  if(useCalendar&&calendarConsent!==true)return res.status(403).json({error:'Autoriza el uso de tu disponibilidad de Google.'});
  const tasks=await tasksFor(req.user.id),existing=await blocksFor(req.user.id);
  // Reorganization proposes a replacement only for unsynchronized future blocks in this window.
  const replace=action==='reorganize'?existing.filter(b=>!b.event_id&&Date.parse(b.start)>=now&&Date.parse(b.start)>=Date.parse(start)&&Date.parse(b.end)<=Date.parse(end)):[];
  let busy=existing.filter(b=>!replace.some(r=>r.id===b.id));
  if(useCalendar)busy=busy.concat(await readBusy(await calendarClient(req.user.id),window));
  const ranked=rankedTasks(tasks,now,(Date.parse(end)-Date.parse(start))/60000);
  const blocks=buildPlan(tasks,window,busy,now),result={ranked:ranked.map(t=>({id:t.id,title:t.title,reasons:t.reasons,score:t.score,remaining:t.remaining})),blocks,replaceIds:replace.map(b=>b.id),steps:[],source:'local',notice:'Propuesta local. No se guardó ni se envió nada a Google.',calendarChecked:!!useCalendar,window};
  if(!useAI||!ranked.length)return res.json(result);
  if(!aiConfig().enabled)return res.status(503).json({error:'IA pendiente de configuración. Usa «Organizar sin IA».'});
  if(aiLocks.has(req.user.id))return res.status(429).json({error:'Ya tienes una consulta de IA en curso.'});
  aiLocks.add(req.user.id);
  try{
   const day=new Date().toISOString().slice(0,10);
   for(const [bucket,cap] of [[day+':global',100],[day+':'+req.user.id,10]]){
    const used=await one('INSERT INTO ai_usage(bucket,n) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET n=ai_usage.n+1 WHERE ai_usage.n<? RETURNING n',bucket,cap);
    if(!used)return res.status(429).json({error:'Se alcanzó el límite diario de IA. Puedes organizarte sin IA.'});
   }
   await run('DELETE FROM ai_usage WHERE bucket<?',day);
   // Minimize data: opaque aliases, no identities, descriptions, grades, dates, or calendar events.
   const chosen=ranked.slice(0,10),context={action,request,tasks:chosen.map((t,i)=>({id:'t'+i,title:t.title,course:courses.get(t.course_id)?.name||'',difficulty:t.difficulty,remaining:t.remaining,reasons:t.reasons}))};
   const advice=await generateAdvice(context);
   result.steps=advice.map(s=>({...s,task_id:chosen[Number(s.task_id.slice(1))].id}));result.source='ai';result.notice='Acciones seleccionadas por IA; prioridades y horarios calculados y validados localmente. Revisa antes de aceptar.';
  }catch{result.notice='La IA no pudo responder de forma válida. Se conserva la propuesta local, sin aplicar cambios.';}
  finally{aiLocks.delete(req.user.id);}
  res.json(result);
 });
 app.post('/api/study/accept',auth,async(req,res)=>{
  if(req.body.confirm!==true)return res.status(403).json({error:'Confirma los bloques antes de guardarlos.'});
  if(locks.has(req.user.id))return res.status(409).json({error:'Espera a que termine la operación anterior.'});locks.add(req.user.id);
  try{
   const {blocks,replaceIds=[]}=req.body;
   if(!Array.isArray(blocks)||blocks.length<1||blocks.length>40||!Array.isArray(replaceIds)||replaceIds.length>40)throw Error('Revisa los bloques de estudio.');
   const tasks=await tasksFor(req.user.id),existing=await blocksFor(req.user.id),now=Date.now();
   const clean=blocks.map(b=>{if(!tasks.some(t=>t.id===b.task_id&&t.status!=='done'))throw Error('Una tarea ya no está disponible. Regenera la propuesta.');const w=validateWindow(b.start,b.end,now);if(Date.parse(w.end)-Date.parse(w.start)>120*60000)throw Error('Cada bloque admite hasta 120 minutos.');return {id:randomUUID(),task_id:b.task_id,...w};});
   for(const id of replaceIds){const old=existing.find(b=>b.id===id);if(!old||old.event_id||Date.parse(old.start)<now)throw Error('Solo se reorganizan tus bloques futuros todavía no enviados a Google.');}
   const busy=existing.filter(b=>!replaceIds.includes(b.id));
   if(req.body.useCalendar){if(req.body.calendarConsent!==true)throw Error('Autoriza la consulta de disponibilidad.');const sorted=[...clean].sort((a,b)=>a.start.localeCompare(b.start));busy.push(...await readBusy(await calendarClient(req.user.id),{start:sorted[0].start,end:sorted.reduce((e,b)=>b.end>e?b.end:e,sorted[0].end)}));}
   for(const block of clean){if(busy.some(b=>overlaps(b,block)))return res.status(409).json({error:'Hay un conflicto de horario. Modifica los bloques o vuelve a organizar.'});busy.push(block);}
   await db.batch([...replaceIds.map(id=>['DELETE FROM study_blocks WHERE id=? AND user_id=?',id,req.user.id]),...clean.map(b=>['INSERT INTO study_blocks(id,user_id,task_id,start_at,end_at) VALUES(?,?,?,?,?)',b.id,req.user.id,b.task_id,b.start,b.end])]);
   res.json(await blocksFor(req.user.id));
  }finally{locks.delete(req.user.id);}
 });
 app.post('/api/study/publish',auth,async(req,res)=>{
  if(req.body.confirm!==true)return res.status(403).json({error:'Confirma la creación de eventos en Google.'});
  if(!Array.isArray(req.body.ids)||!req.body.ids.length||req.body.ids.length>40)throw Error('Selecciona los bloques a enviar.');
  if(locks.has(req.user.id))return res.status(409).json({error:'Espera a que termine la operación anterior.'});locks.add(req.user.id);
  try{
   const existing=await blocksFor(req.user.id),chosen=[...new Set(req.body.ids)].map(id=>existing.find(b=>b.id===id));if(chosen.some(b=>!b))throw Error('Bloque no encontrado.');if(chosen.some(b=>Date.parse(b.start)<=Date.now()))throw Error('Solo se publican bloques futuros. Reorganiza los bloques vencidos.');
   const client=await calendarClient(req.user.id),conn=await one('SELECT * FROM calendar_connections WHERE user_id=?',req.user.id);
   if(req.body.calendarConsent===true){const busy=await readBusy(client,{start:chosen.reduce((a,b)=>b.start<a?b.start:a,chosen[0].start),end:chosen.reduce((a,b)=>b.end>a?b.end:a,chosen[0].end)});if(chosen.some(b=>busy.some(x=>overlaps(x,b))))return res.status(409).json({error:'Google indica un conflicto. Revisa tu disponibilidad antes de publicar.'});}
   const id=await ensureStudyCalendar(client,conn,cid=>run('UPDATE calendar_connections SET calendar_id=? WHERE user_id=?',cid,req.user.id));let count=0;
   for(const b of chosen){const t=await one('SELECT title,status FROM tasks WHERE id=? AND user_id=?',b.task_id,req.user.id);if(!t||t.status==='done')continue;const eid=await publishBlock(client,id,b,t.title);await run('UPDATE study_blocks SET event_id=? WHERE id=? AND user_id=?',eid,b.id,req.user.id);count++;}
   res.json({count});
  }finally{locks.delete(req.user.id);}
 });
 app.post('/api/calendar/availability',auth,async(req,res)=>{if(req.body.consent!==true)return res.status(403).json({error:'Autoriza la consulta de disponibilidad.'});const window=validateWindow(req.body.start,req.body.end);res.json({busy:await readBusy(await calendarClient(req.user.id),window)});});
}
