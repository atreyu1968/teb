import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const courseSource=readFileSync(new URL('../web/ud2-course.js',import.meta.url),'utf8');
const bankSource=readFileSync(new URL('../web/ud2-bank.js',import.meta.url),'utf8');
const examSource=readFileSync(new URL('../web/ud2-exam-bank.js',import.meta.url),'utf8');
const recoverySource=readFileSync(new URL('../web/ud2-recovery-bank.js',import.meta.url),'utf8');
const context={window:{}};
vm.createContext(context);
vm.runInContext(courseSource,context,{filename:'ud2-course.js'});
vm.runInContext(bankSource,context,{filename:'ud2-bank.js'});
vm.runInContext(examSource,context,{filename:'ud2-exam-bank.js'});
vm.runInContext(recoverySource,context,{filename:'ud2-recovery-bank.js'});
const c=context.window.TEB_UD2;
if(!c)throw new Error('TEB_UD2 no se ha definido');
if(c.id!=='teb-ud2-ra2')throw new Error('course id incorrecto');
if(c.hours!==20)throw new Error('UD2 debe tener 20 horas');
if(c.portfolioWeight!==0.60||c.examWeight!==0.40)throw new Error('Ponderación 60/40 incorrecta');
if(c.scenarios.length!==14)throw new Error(`Se esperaban 14 supuestos y hay ${c.scenarios.length}`);
if(c.scenarios.filter(s=>s.stage==='demo').length!==3)throw new Error('Deben existir 3 supuestos demostrativos');
if(c.activityBank.length!==300)throw new Error(`El banco de portafolio debe tener 300 actividades y tiene ${c.activityBank.length}`);
if(c.examBank.length!==300)throw new Error(`El banco de examen debe tener 300 preguntas y tiene ${c.examBank.length}`);
if(c.recoveryBank.length!==300)throw new Error(`El banco de recuperación debe tener 300 preguntas y tiene ${c.recoveryBank.length}`);
if(Object.keys(c.criteria).length!==9)throw new Error('RA2 debe contener 9 criterios');
const expected={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
for(const [ce,n] of Object.entries(expected)){
  const portfolio=c.activityBank.filter(a=>a.criterion===ce).length,exam=c.examBank.filter(a=>a.criterion===ce).length,recovery=c.recoveryBank.filter(a=>a.criterion===ce).length;
  if(portfolio!==n)throw new Error(`${ce}: se esperaban ${n} actividades de portafolio y hay ${portfolio}`);
  if(exam!==n)throw new Error(`${ce}: se esperaban ${n} preguntas de examen y hay ${exam}`);
  if(recovery!==n)throw new Error(`${ce}: se esperaban ${n} preguntas de recuperación y hay ${recovery}`);
}
for(const [name,bank] of [['portafolio',c.activityBank],['examen',c.examBank],['recuperación',c.recoveryBank]])if(new Set(bank.map(a=>a.id)).size!==300)throw new Error(`Hay IDs duplicados en ${name}`);
const allIds=[...c.activityBank,...c.examBank,...c.recoveryBank].map(x=>x.id);if(new Set(allIds).size!==900)throw new Error('Los tres bancos comparten IDs');
const pPrompts=new Set(c.activityBank.map(a=>a.prompt)),ePrompts=new Set(c.examBank.map(a=>a.prompt)),rPrompts=new Set(c.recoveryBank.map(a=>a.prompt));
if(c.examBank.some(a=>pPrompts.has(a.prompt)))throw new Error('Portafolio y examen comparten enunciados literales');
if(c.recoveryBank.some(a=>pPrompts.has(a.prompt)||ePrompts.has(a.prompt)))throw new Error('Recuperación comparte enunciados literales con otro banco');
for(const a of [...c.activityBank,...c.examBank,...c.recoveryBank]){
  if(!a.prompt||!Array.isArray(a.choices)||a.choices.length<3||!Number.isInteger(a.answerIndex))throw new Error(`Actividad incompleta: ${a.id}`);
  if(a.answerIndex<0||a.answerIndex>=a.choices.length)throw new Error(`Respuesta fuera de rango: ${a.id}`);
}
for(const ce of ['RA2.c','RA2.d','RA2.e','RA2.f','RA2.g'])if(c.recoveryBank.filter(a=>a.criterion===ce&&a.kind==='practical').length<5)throw new Error(`${ce} no tiene suficientes ítems prácticos de recuperación`);
const quota={'RA2.a':10,'RA2.b':10,'RA2.c':13,'RA2.d':12,'RA2.e':10,'RA2.f':10,'RA2.g':10,'RA2.h':10,'RA2.i':15};
if(Object.values(quota).reduce((a,b)=>a+b,0)!==100)throw new Error('La selección estratificada no suma 100');
for(const [ce,n] of Object.entries(quota))if(n>expected[ce])throw new Error(`La cuota ${ce} excede el banco`);
const allowedIgic=new Set(['4727','4777']);
for(const code of Object.keys(c.accounts)){if(code.length===3||allowedIgic.has(code))continue;throw new Error(`Cuenta fuera de la regla 3 dígitos/IGIC 4 dígitos: ${code}`)}
for(const s of c.scenarios){if(!s.operations.length)throw new Error(`Supuesto ${s.id} sin operaciones`);for(const o of s.operations){const d=o.entries.reduce((a,x)=>a+x.debit,0),h=o.entries.reduce((a,x)=>a+x.credit,0);if(Math.abs(d-h)>.005)throw new Error(`Asiento descuadrado en ${o.id}: ${d} != ${h}`);for(const e of o.entries)if(!c.accounts[e.account])throw new Error(`Cuenta desconocida ${e.account} en ${o.id}`)}}
console.log(`UD2 OK · ${c.scenarios.length} supuestos · ${c.scenarios.reduce((a,s)=>a+s.operations.length,0)} operaciones · 300 portafolio + 300 examen + 300 recuperación · 9 criterios`);
