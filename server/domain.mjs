export function calculateGrades(rows,target=10.5){
 if(!Array.isArray(rows)||rows.length<1||rows.length>20)throw Error('Ingresa entre 1 y 20 evaluaciones.');
 let total=0,earned=0,known=0;
 for(const r of rows){
  if(typeof r.name!=='string'||!r.name.trim()||r.name.length>100)throw Error('Cada evaluación necesita un nombre.');
  if(typeof r.weight!=='number'||!Number.isFinite(r.weight)||r.weight<=0||r.weight>100)throw Error('Los pesos deben ser mayores que 0 y hasta 100.');
  total+=r.weight;
  if(r.grade!==null){if(typeof r.grade!=='number'||!Number.isFinite(r.grade)||r.grade<0||r.grade>20)throw Error('Las notas deben estar entre 0 y 20.');earned+=r.grade*r.weight/100;known+=r.weight;}
 }
 if(Math.abs(total-100)>0.001)throw Error('Los porcentajes deben sumar exactamente 100%.');
 const remaining=100-known,needed=remaining>0?Math.max(0,(target-earned)/(remaining/100)):null;
 return {earned,known,remaining,needed,possible:needed===null?earned>=target:needed<=20,current:known?earned/(known/100):null,final:remaining===0?earned:null,rounded:remaining===0?Math.floor(earned+0.5):null,passed:earned>=target};
}
export function priority(task,now=Date.now()){
 if(task.status==='done')return -1;
 const hours=(Date.parse(task.due_at)-now)/3600000;
 return (hours<=0?10000:Math.max(0,168-hours)*10)+task.importance*30+Math.min(task.effort,480)/8+(task.status==='working'?20:0);
}
export function validateTask(b,courses){
 if(typeof b.title!=='string'||b.title.trim().length<3||b.title.length>160)throw Error('El título debe tener entre 3 y 160 caracteres.');
 if(!courses.has(b.course_id))throw Error('Selecciona un curso válido de la malla.');
 const due=new Date(b.due_at);if(!b.due_at||!Number.isFinite(due.getTime()))throw Error('Selecciona una fecha y hora válidas.');
 const status=b.status??'pending',visibility=b.visibility??'private';
 if(!['pending','working','done'].includes(status)||!['private','public'].includes(visibility))throw Error('Estado o privacidad inválidos.');
 const effort=Number(b.effort??60),importance=Number(b.importance??2),reminder=Number(b.reminder??1440);
 if(!Number.isInteger(effort)||effort<5||effort>10080||![1,2,3].includes(importance)||!Number.isInteger(reminder)||reminder<0||reminder>40320)throw Error('Revisa la duración, importancia y recordatorio.');
 if(typeof (b.description??'')!=='string'||(b.description??'').length>10000)throw Error('La descripción es demasiado larga.');
 return {title:b.title.trim(),description:(b.description??'').trim(),course_id:b.course_id,due_at:due.toISOString(),status,visibility,effort,importance,reminder};
}
export function ics(tasks,courses){
 const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const date=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Desbloqueate//UC Planner//ES','CALSCALE:GREGORIAN'];
 for(const t of tasks){lines.push('BEGIN:VEVENT',`UID:${t.id}@desbloqueate.local`,`DTSTAMP:${date(new Date())}`,`DTSTART:${date(t.due_at)}`,`DTEND:${date(Date.parse(t.due_at)+1800000)}`,`SUMMARY:${escape(t.title)}`,`DESCRIPTION:${escape(courses.get(t.course_id)?.name||'')}`,`STATUS:${t.status==='done'?'CANCELLED':'CONFIRMED'}`,'BEGIN:VALARM',`TRIGGER:-PT${t.reminder}M`,'ACTION:DISPLAY',`DESCRIPTION:${escape(t.title)}`,'END:VALARM','END:VEVENT');}
 lines.push('END:VCALENDAR');return lines.map(line=>{let out='',part='';for(const ch of line){if(Buffer.byteLength(part+ch)>73){out+=part+'\r\n ';part='';}part+=ch;}return out+part;}).join('\r\n')+'\r\n';
}
