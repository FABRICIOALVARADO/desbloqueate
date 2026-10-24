import express from 'express';
import multer from 'multer';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,randomBytes,createHash,scrypt as scryptCb,timingSafeEqual,createCipheriv,createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {OAuth2Client} from 'google-auth-library';
import {validateTask,calculateGrades,priority,ics} from './domain.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const scrypt=promisify(scryptCb),sha=s=>createHash('sha256').update(s).digest('hex');
const PORT=Number(process.env.PORT||3000),PROD=process.env.NODE_ENV==='production';
const BASE=(process.env.APP_URL||process.env.RENDER_EXTERNAL_URL||`http://localhost:${PORT}`).replace(/\/$/,'');
if(PROD&&!BASE.startsWith('https://'))throw Error('APP_URL debe usar HTTPS en producción.');
const dataDir=resolve(process.env.DATA_DIR||root+'/data');mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(dataDir+'/desbloqueate.sqlite');db.exec(readFileSync(root+'/server/schema.sql','utf8'));
const one=(sql,...p)=>db.prepare(sql).get(...p),all=(sql,...p)=>db.prepare(sql).all(...p),run=(sql,...p)=>db.prepare(sql).run(...p);
const catalog=JSON.parse(readFileSync(root+'/src/assets/curriculum.json','utf8').replace(/^\uFEFF/,''));
const courses=new Map();for(const career of catalog.careers)for(const cycle of career.cycles)cycle.courses.forEach((course,i)=>{course.id=`${career.id}:${cycle.number}:${i}`;courses.set(course.id,{...course,careerId:career.id,career:career.name,cycle:cycle.number});});
const keyFile=dataDir+'/.token-key';if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32),{mode:0o600});const key=process.env.TOKEN_ENCRYPTION_KEY?Buffer.from(process.env.TOKEN_ENCRYPTION_KEY,'base64'):readFileSync(keyFile);if(key.length!==32)throw Error('TOKEN_ENCRYPTION_KEY debe contener 32 bytes en base64.');
function encrypt(obj){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const text=Buffer.concat([cipher.update(JSON.stringify(obj),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),text]).toString('base64');}
function decrypt(value){const b=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
const googleReady=Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
function oauth(){return new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,BASE+'/api/auth/google/callback');}
const app=express();app.disable('x-powered-by');
app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"});if(PROD)res.set('Strict-Transport-Security','max-age=31536000');if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');next();});
app.use(express.json({limit:'256kb'}));
const cookie=(req,name)=>{const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return raw?.slice(name.length+1)||'';};
app.use('/api',(req,res,next)=>{
 const token=cookie(req,'db_session');req.user=token?one('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?',sha(token),Date.now()):null;
 if(!['GET','HEAD','OPTIONS'].includes(req.method)){
  const allowed=[BASE,...(!PROD?['http://localhost:4200','http://127.0.0.1:4200']:[])];
  if(req.headers['x-requested-with']!=='Desbloqueate'||(req.headers.origin&&!allowed.includes(req.headers.origin)))return res.status(403).json({error:'Solicitud no autorizada.'});
 }next();
});
function auth(req,res,next){if(!req.user)return res.status(401).json({error:'Inicia sesión para continuar.'});next();}
function publicUser(u){return {id:u.id,name:u.name,email:u.email,verified:Boolean(u.verified),googleLinked:Boolean(u.google_sub),preferences:JSON.parse(u.preferences),calendarConnected:Boolean(one('SELECT user_id FROM calendar_connections WHERE user_id=?',u.id))};}
function session(res,id){const token=randomBytes(32).toString('hex');run('INSERT INTO sessions VALUES(?,?,?)',sha(token),id,Date.now()+7*864e5);res.cookie('db_session',token,{httpOnly:true,secure:PROD,sameSite:'lax',maxAge:7*864e5,path:'/'});}
const attempts=new Map();function limit(req,res,next){const k=req.ip,now=Date.now(),r=attempts.get(k)||{count:0,until:now+600000};if(r.until<now){r.count=0;r.until=now+600000;}r.count++;attempts.set(k,r);if(r.count>40)return res.status(429).json({error:'Demasiados intentos. Espera 10 minutos.'});next();}
function taskOut(t){return {...t,course:courses.get(t.course_id),attachments:all('SELECT id,name,size,mime FROM attachments WHERE task_id=?',t.id),priority:priority(t)};}
function owned(req,id){const t=one('SELECT * FROM tasks WHERE id=? AND user_id=?',id,req.user.id);if(!t){const e=Error('Tarea no encontrada.');e.status=404;throw e;}return t;}
function ensureCourse(id){if(!courses.has(id))throw Error('Curso no válido.');}
app.get('/api/health',(_,res)=>res.json({ok:true}));
app.get('/api/catalog',(_,res)=>res.json(catalog));
app.get('/api/session',(req,res)=>res.json({user:req.user?publicUser(req.user):null,googleReady}));
app.post('/api/auth/register',limit,async(req,res)=>{
 const {name,email,password}=req.body;
 if(typeof name!=='string'||name.trim().length<2||name.length>80)throw Error('Ingresa tu nombre (2 a 80 caracteres).');
 if(typeof email!=='string'||!/^[-a-z0-9._+]+@continental\.edu\.pe$/i.test(email))throw Error('Usa tu correo institucional @continental.edu.pe.');
 if(typeof password!=='string'||password.length<10||password.length>128)throw Error('Crea una contraseña de 10 a 128 caracteres para Desbloquéate.');
 if(one('SELECT id FROM users WHERE email=?',email.toLowerCase()))return res.status(409).json({error:'Este correo ya tiene una cuenta. Inicia sesión.'});
 const salt=randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex'),id=randomUUID();
 run('INSERT INTO users(id,email,name,password,created_at) VALUES(?,?,?,?,?)',id,email.toLowerCase(),name.trim(),salt+':'+hash,new Date().toISOString());session(res,id);res.status(201).json(publicUser(one('SELECT * FROM users WHERE id=?',id)));
});
app.post('/api/auth/login',limit,async(req,res)=>{
 const email=String(req.body.email||'').toLowerCase(),password=String(req.body.password||'');if(password.length>128)throw Error('Credenciales inválidas.');
 const u=one('SELECT * FROM users WHERE email=?',email),[salt,hash]=(u?.password||'invalid:'+Buffer.alloc(64).toString('hex')).split(':');
 const derived=await scrypt(password,salt,64);if(!u?.password||!timingSafeEqual(derived,Buffer.from(hash,'hex')))return res.status(401).json({error:'Correo o contraseña incorrectos. Si usaste Google, entra con Google.'});
 session(res,u.id);res.json(publicUser(u));
});
app.post('/api/auth/logout',auth,(req,res)=>{run('DELETE FROM sessions WHERE token=?',sha(cookie(req,'db_session')));res.clearCookie('db_session',{path:'/'});res.json({ok:true});});
app.patch('/api/profile',auth,(req,res)=>{
 const {name,preferences}=req.body;if(typeof name!=='string'||name.trim().length<2||name.length>80)throw Error('Revisa tu nombre.');
 const p=preferences||{},clean={theme:['light','dark'].includes(p.theme)?p.theme:'light',accent:['violet','blue','rose','teal'].includes(p.accent)?p.accent:'violet',compact:Boolean(p.compact),reduceMotion:Boolean(p.reduceMotion),careerId:catalog.careers.some(c=>c.id===p.careerId)?p.careerId:'ingenieria-de-sistemas-e-informatica',cycle:Math.min(14,Math.max(1,Number(p.cycle)||1))};
 run('UPDATE users SET name=?,preferences=? WHERE id=?',name.trim(),JSON.stringify(clean),req.user.id);res.json(publicUser(one('SELECT * FROM users WHERE id=?',req.user.id)));
});
app.get('/api/tasks',auth,(req,res)=>res.json(all('SELECT * FROM tasks WHERE user_id=? ORDER BY due_at',req.user.id).map(taskOut)));
app.post('/api/tasks',auth,(req,res)=>{
 if(one('SELECT count(*) n FROM tasks WHERE user_id=?',req.user.id).n>=1000)throw Error('Alcanzaste el límite de 1000 tareas.');
 const t=validateTask(req.body,courses),id=randomUUID(),now=new Date().toISOString();
 run('INSERT INTO tasks(id,user_id,title,description,course_id,due_at,status,visibility,effort,importance,reminder,created_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',id,req.user.id,...Object.values(t),now,t.status==='done'?now:null);
 res.status(201).json(taskOut(owned(req,id)));
});
app.patch('/api/tasks/:id',auth,(req,res)=>{
 const old=owned(req,req.params.id),t=validateTask({...old,...req.body},courses);
 run('UPDATE tasks SET title=?,description=?,course_id=?,due_at=?,status=?,visibility=?,effort=?,importance=?,reminder=?,completed_at=? WHERE id=? AND user_id=?',...Object.values(t),t.status==='done'?(old.completed_at||new Date().toISOString()):null,old.id,req.user.id);
 if(t.status==='done'||t.due_at!==old.due_at||t.reminder!==old.reminder)run('DELETE FROM notifications WHERE task_id=?',old.id);
 res.json(taskOut(owned(req,old.id)));
});
app.delete('/api/tasks/:id',auth,async(req,res)=>{
 const t=owned(req,req.params.id),event=one('SELECT * FROM calendar_events WHERE task_id=?',t.id),conn=one('SELECT * FROM calendar_connections WHERE user_id=?',req.user.id);
 if(event&&conn?.calendar_id){const client=await calendarClient(req.user.id);await client.request({url:`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events/${event.event_id}`,method:'DELETE'}).catch(e=>{if(e.response?.status!==404&&e.response?.status!==410)throw Error('No se pudo quitar el evento de Google. Reintenta o desconecta Calendar antes de eliminar.');});}
 run('DELETE FROM tasks WHERE id=? AND user_id=?',t.id,req.user.id);res.json({ok:true});
});
app.get('/api/community',(req,res)=>{
 const q=String(req.query.q||'').slice(0,120).replace(/[\\%_]/g,'\\$&'),course=String(req.query.course||''),career=String(req.query.career||'');
 let rows=all("SELECT t.*,u.name author FROM tasks t JOIN users u ON u.id=t.user_id WHERE t.visibility='public' AND (t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\') AND (?='' OR t.course_id=?) AND (?='' OR substr(t.course_id,1,instr(t.course_id,':')-1)=?) ORDER BY t.created_at DESC LIMIT 200",'%'+q+'%','%'+q+'%',course,course,career,career);
 rows=rows.filter(t=>(!course||t.course_id===course)&&(!career||courses.get(t.course_id)?.careerId===career));
 res.json(rows.map(t=>{const {user_id,...safe}=taskOut(t);return safe;}));
});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},fileFilter:(_,file,cb)=>cb(null,['.pdf','.png','.jpg','.jpeg','.webp','.docx','.xlsx','.pptx','.txt','.csv'].includes(extname(file.originalname).toLowerCase()))});
app.post('/api/tasks/:id/files',auth,(req,res,next)=>{owned(req,req.params.id);next();},upload.single('file'),(req,res)=>{
 const t=owned(req,req.params.id);if(!req.file)throw Error('Formato admitido: PDF, imagen, Office, TXT o CSV.');
 if(one('SELECT count(*) n FROM attachments WHERE task_id=?',t.id).n>=8)throw Error('Máximo 8 archivos por tarea.');
 const size=one('SELECT coalesce(sum(a.size),0) n FROM attachments a JOIN tasks t ON t.id=a.task_id WHERE t.user_id=?',req.user.id).n;if(size+req.file.size>100*1024*1024)throw Error('Tu espacio de archivos (100 MB) está lleno.');
 const name=Buffer.from(req.file.originalname,'latin1').toString('utf8').replace(/[\r\n\x00-\x1f/\\]/g,'_').slice(0,180),id=randomUUID();
 run('INSERT INTO attachments VALUES(?,?,?,?,?,?)',id,t.id,name,req.file.mimetype,req.file.size,req.file.buffer);res.status(201).json({id,name,size:req.file.size});
});
app.get('/api/files/:id',auth,(req,res)=>{
 const f=one("SELECT a.*,t.user_id,t.visibility FROM attachments a JOIN tasks t ON t.id=a.task_id WHERE a.id=? AND (t.user_id=? OR t.visibility='public')",req.params.id,req.user.id);
 if(!f)return res.status(404).json({error:'Archivo no encontrado.'});res.set({'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`});res.send(Buffer.from(f.data));
});
app.delete('/api/files/:id',auth,(req,res)=>{const f=one('SELECT a.id FROM attachments a JOIN tasks t ON t.id=a.task_id WHERE a.id=? AND t.user_id=?',req.params.id,req.user.id);if(!f)return res.status(404).json({error:'Archivo no encontrado.'});run('DELETE FROM attachments WHERE id=?',f.id);res.json({ok:true});});
app.get('/api/enrollments',auth,(req,res)=>res.json(all('SELECT course_id FROM enrollments WHERE user_id=?',req.user.id).map(r=>r.course_id)));
app.put('/api/enrollments',auth,(req,res)=>{const ids=req.body.courseIds;if(!Array.isArray(ids)||ids.length>100)throw Error('Selecciona hasta 100 cursos.');ids.forEach(ensureCourse);db.exec('BEGIN');try{run('DELETE FROM enrollments WHERE user_id=?',req.user.id);for(const id of new Set(ids))run('INSERT INTO enrollments VALUES(?,?)',req.user.id,id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}res.json(ids);});
app.get('/api/grades',auth,(req,res)=>res.json(all('SELECT course_id,components FROM grades WHERE user_id=?',req.user.id).map(g=>({...g,components:JSON.parse(g.components)}))));
app.put('/api/grades/:course',auth,(req,res)=>{ensureCourse(req.params.course);const result=calculateGrades(req.body.components);run('INSERT INTO grades VALUES(?,?,?) ON CONFLICT(user_id,course_id) DO UPDATE SET components=excluded.components',req.user.id,req.params.course,JSON.stringify(req.body.components));res.json(result);});
function remind(){
 const now=Date.now();for(const t of all("SELECT * FROM tasks WHERE status!='done'")){
  const due=Date.parse(t.due_at);if(now<due-t.reminder*60000||now>due+7*864e5)continue;
  const k=t.id+':'+t.due_at+':'+t.reminder;run('INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,0)',randomUUID(),t.user_id,t.id,k,t.title,new Date().toISOString());
 }
 run('DELETE FROM sessions WHERE expires<?',now);run('DELETE FROM oauth_states WHERE expires<?',now);
 for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
}
app.get('/api/notifications',auth,(req,res)=>{remind();res.json(all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',req.user.id));});
app.post('/api/notifications/read',auth,(req,res)=>{run('UPDATE notifications SET seen=1 WHERE user_id=?',req.user.id);res.json({ok:true});});
app.get('/api/calendar/export',auth,(req,res)=>{res.type('text/calendar').attachment('mis-tareas.ics').send(ics(all('SELECT * FROM tasks WHERE user_id=?',req.user.id),courses));});
app.get('/api/auth/google',limit,(req,res)=>{
 if(!googleReady)return res.redirect('/?authError=google-config');const mode=req.query.mode==='calendar'?'calendar':'login';if(mode==='calendar'&&!req.user)return res.redirect('/?authError=login-required');
 const state=randomBytes(24).toString('hex'),browser=randomBytes(24).toString('hex'),verifier=randomBytes(32).toString('base64url'),nonce=randomBytes(24).toString('hex');
 run('INSERT INTO oauth_states VALUES(?,?,?,?,?,?,?)',state,sha(browser),verifier,nonce,mode,req.user?.id||null,Date.now()+600000);res.cookie('db_oauth',browser,{httpOnly:true,secure:PROD,sameSite:'lax',maxAge:600000,path:'/'});
 const scopes=['openid','email','profile'];if(mode==='calendar')scopes.push('https://www.googleapis.com/auth/calendar.app.created');
 res.redirect(oauth().generateAuthUrl({access_type:mode==='calendar'?'offline':'online',scope:scopes,state,nonce,hd:'continental.edu.pe',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',...(mode==='calendar'?{prompt:'consent'}:{prompt:'select_account'})}));
});
app.get('/api/auth/google/callback',async(req,res)=>{
 try{
  const state=one('SELECT * FROM oauth_states WHERE state=? AND expires>?',String(req.query.state||''),Date.now());if(!state||state.browser_token!==sha(cookie(req,'db_oauth')))throw Error('Estado OAuth inválido.');run('DELETE FROM oauth_states WHERE state=?',state.state);res.clearCookie('db_oauth',{path:'/'});
  if(req.query.error)throw Error('Google no autorizó el acceso.');const client=oauth(),{tokens}=await client.getToken({code:String(req.query.code||''),codeVerifier:state.verifier});
  const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID}),p=ticket.getPayload();
  if(!p?.email_verified||p.hd!=='continental.edu.pe'||!p.email?.endsWith('@continental.edu.pe')||p.nonce!==state.nonce)throw Error('Utiliza tu cuenta institucional de Continental.');
  let user=one('SELECT * FROM users WHERE google_sub=?',p.sub);
  if(state.mode==='calendar'){
   if(!req.user||req.user.id!==state.user_id||req.user.email!==p.email.toLowerCase())throw Error('Conecta el mismo correo de tu cuenta.');
   if(user&&user.id!==req.user.id)throw Error('Esa cuenta de Google ya está vinculada.');user=req.user;
   if(!(tokens.scope||'').split(' ').includes('https://www.googleapis.com/auth/calendar.app.created'))throw Error('Falta el permiso de Calendar.');
   const old=one('SELECT * FROM calendar_connections WHERE user_id=?',user.id),previous=old?decrypt(old.tokens):{};
   if(!tokens.refresh_token&&!previous.refresh_token)throw Error('Google no entregó permiso de acceso continuo. Vuelve a conectar Calendar.');
   run('UPDATE users SET google_sub=?,verified=1 WHERE id=?',p.sub,user.id);
   run('INSERT INTO calendar_connections VALUES(?,?,NULL) ON CONFLICT(user_id) DO UPDATE SET tokens=excluded.tokens',user.id,encrypt({...previous,...tokens,refresh_token:tokens.refresh_token||previous.refresh_token}));
  }else if(!user){
   if(one('SELECT id FROM users WHERE email=?',p.email.toLowerCase()))return res.redirect('/?authError=existing-account');
   const id=randomUUID();run('INSERT INTO users(id,email,name,google_sub,verified,created_at) VALUES(?,?,?,?,1,?)',id,p.email.toLowerCase(),p.name||'Estudiante',p.sub,new Date().toISOString());user=one('SELECT * FROM users WHERE id=?',id);
  }
  session(res,user.id);res.redirect('/?connected='+state.mode);
 }catch(e){console.error('OAuth:',e.message);res.redirect('/?authError=google-failed');}
});
async function calendarClient(uid){const conn=one('SELECT * FROM calendar_connections WHERE user_id=?',uid);if(!conn){const e=Error('Conecta Google Calendar primero.');e.status=409;throw e;}const client=oauth(),tokens=decrypt(conn.tokens);client.setCredentials(tokens);client.on('tokens',fresh=>{const latest=one('SELECT tokens FROM calendar_connections WHERE user_id=?',uid);if(latest)run('UPDATE calendar_connections SET tokens=? WHERE user_id=?',encrypt({...decrypt(latest.tokens),...fresh}),uid);});return client;}
const syncing=new Set();
app.post('/api/calendar/sync',auth,async(req,res)=>{
 if(syncing.has(req.user.id))return res.status(409).json({error:'Ya hay una sincronización en curso.'});syncing.add(req.user.id);
 try{
  const client=await calendarClient(req.user.id);let conn=one('SELECT * FROM calendar_connections WHERE user_id=?',req.user.id);
  if(!conn.calendar_id){const {data}=await client.request({url:'https://www.googleapis.com/calendar/v3/calendars',method:'POST',data:{summary:'Desbloquéate · Mis entregas',timeZone:'America/Lima'}});run('UPDATE calendar_connections SET calendar_id=? WHERE user_id=?',data.id,req.user.id);conn={...conn,calendar_id:data.id};}
  const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`;let count=0;
  for(const t of all('SELECT * FROM tasks WHERE user_id=?',req.user.id)){
   const saved=one('SELECT * FROM calendar_events WHERE task_id=?',t.id),eid=saved?.event_id||t.id.replaceAll('-','');
   if(t.status==='done'){if(saved){await client.request({url:url+'/'+eid,method:'DELETE'}).catch(e=>{if(![404,410].includes(e.response?.status))throw e;});run('DELETE FROM calendar_events WHERE task_id=?',t.id);}continue;}
   const event={summary:t.title,description:(courses.get(t.course_id)?.name||'')+'\n'+t.description,start:{dateTime:t.due_at,timeZone:'America/Lima'},end:{dateTime:new Date(Date.parse(t.due_at)+1800000).toISOString(),timeZone:'America/Lima'},visibility:'private',reminders:{useDefault:false,overrides:[{method:'popup',minutes:t.reminder}]}},body={...event,id:eid};
   try{await client.request({url:url+'/'+eid,method:'PUT',data:event});}catch(e){if(![404,410].includes(e.response?.status))throw e;await client.request({url,method:'POST',data:body});}
   run('INSERT INTO calendar_events VALUES(?,?) ON CONFLICT(task_id) DO UPDATE SET event_id=excluded.event_id',t.id,eid);count++;
  }
  res.json({count});
 }finally{syncing.delete(req.user.id);}
});
app.get('/api/calendar/events',auth,async(req,res)=>{
 const conn=one('SELECT * FROM calendar_connections WHERE user_id=?',req.user.id);if(!conn?.calendar_id)return res.json([]);
 const client=await calendarClient(req.user.id),{data}=await client.request({url:`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`,params:{maxResults:250,singleEvents:true,orderBy:'startTime',timeMin:new Date(Date.now()-30*864e5).toISOString()}});res.json((data.items||[]).map(e=>({id:e.id,title:e.summary,start:e.start?.dateTime||e.start?.date,link:e.htmlLink})));
});
app.post('/api/calendar/disconnect',auth,async(req,res)=>{const conn=one('SELECT * FROM calendar_connections WHERE user_id=?',req.user.id);if(conn){const tokens=decrypt(conn.tokens);if(tokens.refresh_token)await oauth().revokeToken(tokens.refresh_token).catch(()=>{});run('DELETE FROM calendar_connections WHERE user_id=?',req.user.id);run('DELETE FROM calendar_events WHERE task_id IN (SELECT id FROM tasks WHERE user_id=?)',req.user.id);}res.json({ok:true});});
app.use('/api',(_,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
const dist=root+'/dist/desbloqueate/browser';app.use(express.static(dist,{index:false}));app.get('/{*path}',(_,res)=>{if(existsSync(dist+'/index.html'))res.sendFile(dist+'/index.html');else res.status(503).send('Compila primero con npm run build.');});
app.use((error,req,res,next)=>{if(res.headersSent)return next(error);const status=error.status||((error.code==='LIMIT_FILE_SIZE')?413:400);if(error.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'El archivo supera 10 MB.'});if(error.response)console.error('External API error',error.response.status);res.status(status).json({error:error.response?'No se pudo completar la conexión con Google. Revisa permisos y vuelve a intentar.':error.message||'No se pudo completar la operación.'});});
const timer=setInterval(remind,30000);timer.unref();
const server=app.listen(PORT,process.env.HOST||'127.0.0.1',()=>console.log(`Desbloquéate: ${BASE}`));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
