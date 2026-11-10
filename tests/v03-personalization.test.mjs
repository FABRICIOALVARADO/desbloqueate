import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import {readFile} from 'node:fs/promises';
const source=(await readFile('src/app/app.component.ts','utf8')).replace(/^import .*;\r?\n/gm,'');
const prelude='const normalizeSearch=s=>s.toLowerCase();const AcademicBookComponent={},CommunityComponent={},LearningComponent={},Component=()=>x=>x,HostListener=()=>()=>{},CommonModule={},FormsModule={},ExperienceComponent={},MainNavComponent={},PlanningComponent={};';
const code=ts.transpileModule(prelude+source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const {AppComponent}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('autosave preserves course identity when switching before debounce and keeps blank grades',async()=>{
 const writes=[];const app=new AppComponent({request:async(path,method,body)=>{writes.push({path,body});}});app.user={id:'qa'};app.gradeCourse='course-A';app.gradeRows[0].grade=0;app.queueGrades();app.gradeCourse='course-B';app.selectGrade();app.gradeRows[0].grade=16;app.queueGrades();await new Promise(r=>setTimeout(r,800));await app.gradeQueue;
 assert.deepEqual(writes.map(x=>x.path),['/grades/course-A','/grades/course-B']);assert.equal(writes[0].body.components[0].grade,0);assert.equal(writes[1].body.components[0].grade,16);assert.equal(writes[0].body.components[1].grade,null);assert.deepEqual(writes[1].body.components.map(r=>r.weight),[20,25,20,35]);app.ngOnDestroy();
});
test('invalid weights do not overwrite saved grades and failures remain visible',async()=>{
 let count=0;const app=new AppComponent({request:async()=>{count++;throw Error('Sin conexión');}});app.user={id:'qa'};app.gradeCourse='course-A';app.gradeRows[0].weight=40;await app.saveGrades();assert.equal(count,0);app.gradeRows[0].weight=20;await app.saveGrades();assert.equal(count,1);assert.match(app.gradeError,/Sin conexión/);assert.match(app.gradeSaveStatus,/No guardado/);app.ngOnDestroy();
});

test('grades show enrolled courses first and historical saved courses only on demand',()=>{
 const app=new AppComponent({});app.careers=[{id:'career',name:'Carrera',cycles:[{number:1,courses:[{id:'old',name:'Anterior'},{id:'unused',name:'Sin notas'}]},{number:2,courses:[{id:'current',name:'Actual'}]}]}];app.enrolled=['current'];app.gradeRecords=[{course_id:'old',components:[]}];app.gradeCareer='career';
 assert.deepEqual(app.gradeMatches.map(c=>c.id),['current']);app.gradeHistory=true;assert.deepEqual(app.gradeMatches.map(c=>c.id),['old']);
});
test('delivery without attachment is rejected before any save',async()=>{
 let calls=0;const app=new AppComponent({request:async()=>{calls++;}});app.careers=[{id:'c',cycles:[{number:1,courses:[{id:'a',name:'Curso'}]}]}];app.enrolled=['a'];app.form={course_id:'a'};await app.saveTask();assert.equal(calls,0);assert.match(app.taskError,/Adjunta/);assert.equal(app.busy,false);
});
