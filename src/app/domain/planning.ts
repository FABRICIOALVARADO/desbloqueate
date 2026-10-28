export interface PlanningTask { id:string; due_at:string; status:string; importance:number; effort:number; difficulty?:number; progress?:number }
export interface Interval {start:string;end:string}
export interface StudyBlock extends Interval {task_id:string}
export function rankTask(t:PlanningTask, now:number, available=60){
  if(t.status==='done')return {score:-1,reasons:['Completada'],remaining:0};
  const hours=(Date.parse(t.due_at)-now)/3600000;
  const progress=Math.max(0,Math.min(100,t.progress??(t.status==='working'?25:0)));
  const remaining=Math.max(5,Math.ceil(t.effort*(1-progress/100)));
  const difficulty=t.difficulty??2;
  const urgency=Number.isFinite(hours)?hours<=0?10000:Math.max(0,168-hours)*10:0;
  const score=Math.round(urgency+t.importance*30+difficulty*15+Math.min(remaining,480)/8+(remaining<=available?35:0)+(progress>0?20:0));
  const reasons=[!Number.isFinite(hours)?'Fecha pendiente de revisar':hours<=0?'Entrega vencida':hours<24?'Vence en menos de un día':hours<72?'Vence en los próximos tres días':'Fecha registrada',`Importancia ${t.importance}/3`, `Dificultad ${difficulty}/3`,`${remaining} min estimados pendientes`,remaining<=available?'Cabe en tu disponibilidad':'Conviene dividirla en bloques'];
  return {score,reasons,remaining};
}
export function rankedTasks<T extends PlanningTask>(tasks:T[],now:number,available=60){return tasks.filter(t=>t.status!=='done').map(t=>({...t,...rankTask(t,now,available)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));}
export function overlaps(a:Interval,b:Interval){return Date.parse(a.start)<Date.parse(b.end)&&Date.parse(b.start)<Date.parse(a.end);}
export function validateWindow(start:string,end:string,now=Date.now()):Interval {
 const a=Date.parse(start),b=Date.parse(end);
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<now-60000||b<=a||b-a>12*3600000||a>now+31*86400000)throw Error('Elige un horario futuro de hasta 12 horas, dentro de los próximos 31 días.');
 return {start:new Date(a).toISOString(),end:new Date(b).toISOString()};
}
export function buildPlan(tasks:PlanningTask[],window:Interval,busy:Interval[],now:number,blockMinutes=25,breakMinutes=5):StudyBlock[]{
 const end=Date.parse(window.end);let cursor=Math.max(now,Date.parse(window.start));
 const ordered=rankedTasks(tasks,now,(end-cursor)/60000), result:StudyBlock[]=[];
 const occupied=busy.map(b=>({a:Date.parse(b.start),b:Date.parse(b.end)})).filter(b=>Number.isFinite(b.a)&&Number.isFinite(b.b)).sort((a,b)=>a.a-b.a);
 for(const task of ordered){let remaining=task.remaining;
  while(remaining>=5&&result.length<40){const minutes=Math.min(blockMinutes,remaining);let stop=cursor+minutes*60000;
   const clash=occupied.find(b=>cursor<b.b&&b.a<stop);
   if(clash){cursor=clash.b;continue;}
   if(stop>end) return result;
   result.push({task_id:task.id,start:new Date(cursor).toISOString(),end:new Date(stop).toISOString()});remaining-=minutes;cursor=stop+breakMinutes*60000;
  }
 }
 return result;
}
