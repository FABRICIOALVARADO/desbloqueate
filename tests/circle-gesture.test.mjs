import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/app/experience/circle-gesture.ts',import.meta.url),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {isClosedCircle}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const arc=(end=2*Math.PI,r=100)=>Array.from({length:65},(_,i)=>[200+Math.cos(i/64*end)*r,200+Math.sin(i/64*end)*r]);
test('entrance accepts a closed circle in either direction and tolerates hand jitter',()=>{assert.ok(isClosedCircle(arc()));assert.ok(isClosedCircle(arc().reverse()));assert.ok(isClosedCircle(arc().map(([x,y],i)=>[x+Math.sin(i)*3,y+Math.cos(i)*3])));});
test('entrance rejects taps, straight strokes, open arcs and tiny circles',()=>{assert.equal(isClosedCircle([[1,1]]),false);assert.equal(isClosedCircle(Array.from({length:40},(_,i)=>[i*4,i*4])),false);assert.equal(isClosedCircle(arc(Math.PI*1.4)),false);assert.equal(isClosedCircle(arc(Math.PI*2,10)),false);});
