import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const dir = mkdtempSync(join(tmpdir(), 'pitr-process-'))
let source = readFileSync('src/report/process-insights.ts', 'utf8')
source = source.replace("import { SUBJECTS, subjectOf, secondsLabel } from '../process'", `const SUBJECTS=[{id:'person',label:'Person',color:'#5d78aa'},{id:'umbrella',label:'Umbrella',color:'#258778'},{id:'rain',label:'Rain',color:'#9470b3'},{id:'scene',label:'Other elements',color:'#c78045'},{id:'unlabelled',label:'Unlabelled',color:'#77818b'}];const subjectOf=(s:{subject?:string})=>SUBJECTS.some(g=>g.id===s.subject)?s.subject!:'unlabelled';const secondsLabel=(s:number)=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');`)
source = source.replace("import type { DrawingSubject, FillOperation, StrokeRecord } from '../types'", 'type DrawingSubject=string;type FillOperation={subject?:string};type StrokeRecord={subject?:string;tool:string;points:unknown[];start:number;end:number};')
writeFileSync(join(dir,'process.ts'),source)
execFileSync('pnpm',['exec','tsc','--ignoreConfig',join(dir,'process.ts'),'--module','commonjs','--target','es2022','--skipLibCheck','--outDir',dir],{stdio:'pipe'})
writeFileSync(join(dir,'package.json'),' {"type":"commonjs"}')
const {processInsights}=createRequire(import.meta.url)(join(dir,'process.js'))
const base=1000
const mark=(subject,start,end)=>({subject,start:base+start*1000,end:base+end*1000,tool:'ink',points:[{x:0,y:0}]})
test('shares include unknown strokes, exclude eraser/fills and distinguish active time from spans',()=>{
 const m=processInsights([mark('person',0,2),mark('rain',3,4),mark('person',5,7),mark('unlabelled',8,9),{...mark('umbrella',9,100),tool:'eraser'}],[{subject:'umbrella',t:base+99999}],base)
 assert.equal(m.totalSeconds,6);assert.equal(m.groups[0].share,4/6*100);assert.equal(m.groups[0].last,7);assert.equal(m.groups[0].activeSeconds,4)
 assert.equal(m.groups[0].returns,1);assert.equal(m.coverage,3/4*100);assert.equal(m.groups[1].activeSeconds,0);assert.equal(m.groups[1].fillCount,1)
 assert(Math.abs(m.groups.reduce((n,g)=>n+g.share,0)-100)<1e-9)
})
test('empty and zero-duration data produce honest finite values',()=>{
 for(const m of [processInsights([],[],base),processInsights([mark('person',3,3)],[],base)]){
  assert.equal(m.totalSeconds,0);assert(m.groups.every(g=>g.share===0&&Number.isFinite(g.share)))
 }
})
test('unknown labels stay unknown rather than false person recognition',()=>{
 const m=processInsights([mark('wrong-label',0,1)],[],base);assert.equal(m.groups.at(-1).share,100);assert.equal(m.coverage,0);assert.equal(m.order.length,0)
})
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}))
