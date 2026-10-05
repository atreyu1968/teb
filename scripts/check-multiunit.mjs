import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT=18081;
const BASE=`http://127.0.0.1:${PORT}`;
const dataDir=mkdtempSync(join(tmpdir(),'teb-ci-'));
const server=spawn(process.execPath,['server/server.mjs'],{env:{...process.env,PORT:String(PORT),DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(path,{method='GET',token,body,expect=200}={}){
  const r=await fetch(BASE+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({}));
  if(r.status!==expect)throw new Error(`${method} ${path}: esperado ${expect}, recibido ${r.status}: ${JSON.stringify(d)}`);
  return d;
}
async function waitHealth(){for(let i=0;i<40;i++){try{return await call('/api/health')}catch{await sleep(100)}}throw new Error('El servidor no respondió a /api/health');}
try{
  const health=await waitHealth();
  if(!health.courses.some(x=>x.id==='teb-ud1-ra1')||!health.courses.some(x=>x.id==='teb-ud2-ra2'))throw new Error('No aparecen UD1 y UD2 en health');
  const setup=await call('/api/setup',{method:'POST',body:{username:'admin-ci',password:'prueba-segura-123'}});
  const admin=setup.token;
  const studentCreated=await call('/api/admin/students',{method:'POST',token:admin,body:{firstName:'Alumno',lastName:'Prueba',pin:'1234'}});
  const login=await call('/api/login',{method:'POST',body:{role:'student',code:studentCreated.student.code,pin:'1234'}});
  const student=login.token;

  await call('/api/progress',{method:'PUT',token:student,body:{courseId:'teb-ud1-ra1',version:'ci',state:{marker:'ud1'},score:55,completion:40,timeSeconds:1200,currentSession:4,status:'incomplete'}});
  await call('/api/progress',{method:'PUT',token:student,body:{courseId:'teb-ud2-ra2',version:'ci',state:{marker:'ud2'},score:77,completion:25,timeSeconds:900,currentSession:3,status:'incomplete'}});
  const p1=await call('/api/progress?courseId=teb-ud1-ra1',{token:student});
  const p2=await call('/api/progress?courseId=teb-ud2-ra2',{token:student});
  if(p1.state.marker!=='ud1'||p2.state.marker!=='ud2'||p1.score!==55||p2.score!==77)throw new Error('El progreso de UD1 y UD2 se ha mezclado');

  const portfolio={};const exam={};
  for(const ce of ['RA2.a','RA2.b','RA2.c','RA2.d','RA2.e','RA2.f','RA2.g','RA2.h','RA2.i']){portfolio[ce]=ce==='RA2.d'?40:80;exam[ce]=ce==='RA2.d'?40:80;}
  await call('/api/assessment',{method:'POST',token:student,body:{courseId:'teb-ud2-ra2',instrument:'portfolio',criteria:portfolio,ref:'ci-portfolio'}});
  await call('/api/assessment',{method:'POST',token:student,body:{courseId:'teb-ud2-ra2',instrument:'exam',criteria:exam,ref:'ci-exam'},expect:403});
  await call('/api/admin/course-settings/teb-ud2-ra2',{method:'PUT',token:admin,body:{examEnabled:true}});
  const result=await call('/api/assessment',{method:'POST',token:student,body:{courseId:'teb-ud2-ra2',instrument:'exam',criteria:exam,ref:'ci-exam'}});
  if(Math.abs(result.criteria['RA2.d'].score-40)>.001||result.criteria['RA2.d'].passed)throw new Error('RA2.d debería quedar suspenso con 40/40');
  if(Math.abs(result.criteria['RA2.a'].score-80)>.001||!result.criteria['RA2.a'].passed)throw new Error('RA2.a debería quedar superado con 80/80');
  const recovery=await call('/api/recovery?courseId=teb-ud2-ra2',{token:student});
  if(recovery.pending.length!==1||recovery.pending[0].criterion!=='RA2.d')throw new Error(`Recuperación incorrecta: ${JSON.stringify(recovery.pending)}`);
  console.log('MULTIUNIT OK · progreso separado · examen bloqueable · RA2 60/40 · recuperación selectiva');
} finally {
  server.kill('SIGTERM');
  await sleep(100);
  rmSync(dataDir,{recursive:true,force:true});
  if(server.exitCode&&server.exitCode!==0)console.error(logs);
}
