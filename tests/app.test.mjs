import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {calculateGrades,priority,ics} from '../server/domain.mjs';
test('weighted grades: pending, impossible and final rounding',()=>{
 const rows=[{name:'A',weight:60,grade:12},{name:'B',weight:40,grade:null}];
 assert.ok(Math.abs(calculateGrades(rows).needed-8.25)<1e-10);
 assert.equal(calculateGrades([{name:'A',weight:90,grade:0},{name:'B',weight:10,grade:null}]).possible,false);
 assert.equal(calculateGrades([{name:'Final',weight:100,grade:10.5}]).rounded,11);
 assert.equal(calculateGrades([{name:'Final',weight:100,grade:10.49}]).passed,false);
 assert.throws(()=>calculateGrades([{name:'A',weight:80,grade:12}]));
});
test('prioritization and escaped calendar export',()=>{
 const t={id:'1',title:'Informe; uno, dos\nNuevo',course_id:'c',due_at:'2026-10-23T12:00:00Z',status:'pending',importance:2,effort:60,reminder:60};
 assert.ok(priority(t,Date.parse('2026-10-24'))>10000);
 assert.equal(priority({...t,status:'done'}),-1);
 const output=ics([t],new Map());assert.ok(output.includes('Informe\\; uno\\, dos\\nNuevo'));assert.ok(output.includes('TRIGGER:-PT60M'));
});
test('accounts, ownership, uploads, reminders and durable storage',async()=>{
 const tag=Date.now();const email1='qa1-'+tag+'@continental.edu.pe',email2='qa2-'+tag+'@continental.edu.pe';
 const dir=await mkdtemp(resolve(tmpdir(),'desbloqueate-test-'));
 const port=34000+Math.floor(Math.random()*1000),base=`http://localhost:${port}`;
 let child;let logs='';
 const start=async()=>{child=spawn(process.execPath,['server/index.mjs'],{cwd:resolve('.'),env:{...process.env,PORT:String(port),APP_URL:base,DATA_DIR:dir,GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''},stdio:['ignore','pipe','pipe']});child.stderr.on('data',d=>logs+=d);for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error(logs);};
 const stop=async()=>{if(child.exitCode!==null)return;await new Promise(r=>{child.once('exit',r);child.kill();});};
 const request=async(path,{cookie='',method='GET',body}={})=>{const res=await fetch(base+'/api'+path,{method,headers:{'X-Requested-With':'Desbloqueate',...(cookie?{Cookie:cookie}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 try{
 await start();
 assert.equal((await request('/tasks')).status,401);
 assert.equal((await request('/auth/register',{method:'POST',body:{name:'Alumno',email:'x@gmail.com',password:'test-password-123'}})).status,400);
 const a=await request('/auth/register',{method:'POST',body:{name:'Alumno Uno',email:email1,password:'test-password-123'}});
 const b=await request('/auth/register',{method:'POST',body:{name:'Alumno Dos',email:email2,password:'test-password-123'}});
 assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(a.data.verified,false);
 const catalog=(await request('/catalog')).data,career=catalog.careers[0],course=career.cycles[0].courses[0].id;
 assert.equal(catalog.careers.length,32);assert.ok(course);
 const created=await request('/tasks',{method:'POST',cookie:a.cookie,body:{title:'Informe de prueba',course_id:course,due_at:new Date(Date.now()+3600000).toISOString(),reminder:1440}});
 assert.equal(created.status,201,JSON.stringify(created));const id=created.data.id;assert.equal(created.data.visibility,'private');
 assert.equal((await request('/community')).data.length,0);
 assert.equal((await request('/tasks/'+id,{method:'PATCH',cookie:b.cookie,body:{title:'Otro título'}})).status,404);
 const form=new FormData();form.set('file',new Blob(['prueba de archivo']), 'prueba.txt');
 const uploaded=await request('/tasks/'+id+'/files',{method:'POST',cookie:a.cookie,body:form});assert.equal(uploaded.status,201);
 const file=uploaded.data.id;assert.equal((await request('/files/'+file,{cookie:b.cookie})).status,404);
 assert.equal((await request('/files/'+file)).status,401);
 await request('/tasks/'+id,{method:'PATCH',cookie:a.cookie,body:{visibility:'public'}});
 const shared=(await request('/community')).data;assert.equal(shared.length,1);assert.equal(shared[0].user_id,undefined);assert.equal(shared[0].email,undefined);
 assert.equal((await request('/files/'+file,{cookie:b.cookie})).data,'prueba de archivo');
 await request('/tasks/'+id,{method:'PATCH',cookie:a.cookie,body:{visibility:'private'}});
 assert.equal((await request('/files/'+file,{cookie:b.cookie})).status,404);
 assert.equal((await request('/notifications',{cookie:a.cookie})).data.length,1);
 assert.ok((await request('/calendar/export',{cookie:a.cookie})).data.includes('BEGIN:VEVENT'));
 const grades=await request('/grades/'+encodeURIComponent(course),{method:'PUT',cookie:a.cookie,body:{components:[{name:'Final',weight:100,grade:11}]}});assert.equal(grades.data.passed,true);
 await stop();await start();
 assert.equal((await request('/tasks',{cookie:a.cookie})).data.length,1);
 assert.equal((await request('/grades',{cookie:a.cookie})).data.length,1);
 await request('/tasks/'+id,{method:'PATCH',cookie:a.cookie,body:{status:'done'}});
 assert.equal((await request('/notifications',{cookie:a.cookie})).data.length,0);
 await request('/auth/logout',{method:'POST',cookie:a.cookie});assert.equal((await request('/tasks',{cookie:a.cookie})).status,401);
 assert.equal((await request('/auth/login',{method:'POST',body:{email:email1,password:'test-password-123'}})).status,200);
 }finally{await stop();}
});

