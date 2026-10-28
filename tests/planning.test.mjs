import test from 'node:test';import assert from 'node:assert/strict';
import {rankTask,rankedTasks,buildPlan,overlaps,validateWindow} from '../src/app/domain/planning.ts';
import {generateAdvice,validateAdvice,aiConfig} from '../server/ai-provider.mjs';
import {scopesFor,calendarScope,busyScope,readBusy,publishBlock} from '../server/calendar-service.mjs';
const now=Date.parse('2026-10-28T14:00:00Z');
const task={id:'a',status:'pending',due_at:'2026-10-28T18:00:00Z',effort:60,importance:2,difficulty:2,progress:0};
test('ranking is deterministic; deadline, importance, difficulty, progress and availability matter',()=>{
 assert.deepEqual(rankTask(task,now),rankTask(task,now));
 assert.ok(rankTask({...task,due_at:'2026-10-28T13:00:00Z'},now).score>rankTask(task,now).score);
 assert.ok(rankTask({...task,importance:3},now).score>rankTask(task,now).score);
 assert.ok(rankTask({...task,difficulty:3},now).score>rankTask(task,now).score);
 assert.equal(rankTask({...task,progress:50},now).remaining,30);
 assert.ok(rankTask(task,now,60).score>rankTask(task,now,30).score);
 assert.deepEqual(rankedTasks([{...task,status:'done'}],now),[]);
 assert.ok(Number.isFinite(rankTask({...task,due_at:''},now).score));
});
test('planning respects busy time, breaks, finite window and input immutability',()=>{
 const source=structuredClone(task),window={start:'2026-10-28T14:00:00Z',end:'2026-10-28T16:00:00Z'},busy=[{start:'2026-10-28T14:20:00Z',end:'2026-10-28T14:45:00Z'}];
 const plan=buildPlan([task],window,busy,now);assert.equal(Date.parse(plan[0].start),Date.parse(busy[0].end));assert.equal(plan.length,3);
 plan.forEach(b=>assert.equal(busy.some(x=>overlaps(x,b)),false));assert.deepEqual(task,source);
 assert.equal(Date.parse(plan[1].start)-Date.parse(plan[0].end),5*60000);
 assert.throws(()=>validateWindow(window.end,window.start,now));assert.throws(()=>validateWindow('invalid',window.end,now));
 assert.deepEqual(buildPlan([task],window,[window],now),[]);
});
test('AI rejects invented tasks/actions and malformed/incomplete responses',()=>{
 assert.throws(()=>validateAdvice({steps:[{task_id:'invented',action:'read'}]},['t0']));
 assert.throws(()=>validateAdvice({steps:[{task_id:'t0',action:'write_essay'}]},['t0']));assert.throws(()=>validateAdvice({},['t0']));
 assert.equal(validateAdvice({steps:[{task_id:'t0',action:'read'}]},['t0'])[0].text,'Lee las instrucciones e identifica qué debes entregar.');
 assert.equal(aiConfig({}).enabled,false);
});
test('provider contract sends minimized context server-side and handles failure without retries',async()=>{
 const env={AI_ENABLED:'true',AI_PROVIDER:'gemini',AI_MODEL:'test-model',AI_API_KEY:'test-only-not-real'},ctx={action:'start',tasks:[{id:'t0',title:'Revisar lectura'}]};let calls=0;
 const steps=await generateAdvice(ctx,env,async(url,options)=>{calls++;assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));assert.equal(options.headers['x-goog-api-key'],env.AI_API_KEY);assert.ok(JSON.parse(options.body).generationConfig.responseJsonSchema);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({steps:[{task_id:'t0',action:'read'}]})}]}}]}));});
 assert.equal(steps.length,1);assert.equal(calls,1);
 await assert.rejects(generateAdvice(ctx,env,async()=>new Response('Quota',{status:429})),/cuota/);
 await assert.rejects(generateAdvice(ctx,env,async()=>new Response(JSON.stringify({candidates:[]}))),/válida/);
});
test('Google permissions are separate and unavailable free/busy never means free',async()=>{
 assert.deepEqual(scopesFor('login'),['openid','email','profile']);assert.deepEqual(scopesFor('link'),scopesFor('login'));
 assert.ok(scopesFor('calendar').includes(calendarScope));assert.ok(!scopesFor('calendar').includes(busyScope));assert.ok(scopesFor('availability').includes(busyScope));
 await assert.rejects(readBusy({credentials:{scope:calendarScope}},{start:'',end:''}),/Autoriza/);
 await assert.rejects(readBusy({credentials:{scope:busyScope},request:async()=>({data:{calendars:{primary:{errors:[{reason:'notFound'}]}}}})},{start:'',end:''}),/No se asumirá/);
 const busy=await readBusy({credentials:{scope:busyScope},request:async()=>({data:{calendars:{primary:{busy:[]}}}})},{start:'',end:''});assert.deepEqual(busy,[]);
});
test('Google event retries keep stable IDs rather than duplicate study blocks',async()=>{
 const calls=[];const client={request:async x=>{calls.push(x);if(x.method==='POST')throw {response:{status:409}};}};
 assert.equal(await publishBlock(client,'cal',{id:'abcd-1234',start:'2026-10-28T14:00:00Z',end:'2026-10-28T14:25:00Z'},'Lectura'),'abcd1234');assert.deepEqual(calls.map(c=>c.method),['POST','PUT']);assert.equal(calls[1].data.visibility,'private');
});
