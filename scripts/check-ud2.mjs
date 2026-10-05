import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const courseSource=readFileSync(new URL('../web/ud2-course.js',import.meta.url),'utf8');
const bankSource=readFileSync(new URL('../web/ud2-bank.js',import.meta.url),'utf8');
const context={window:{}};
vm.createContext(context);
vm.runInContext(courseSource,context,{filename:'ud2-course.js'});
vm.runInContext(bankSource,context,{filename:'ud2-bank.js'});
const c=context.window.TEB_UD2;
if(!c)throw new Error('TEB_UD2 no se ha definido');
if(c.id!=='teb-ud2-ra2')throw new Error('course id incorrecto');
if(c.hours!==20)throw new Error('UD2 debe tener 20 horas');
if(c.portfolioWeight!==0.60||c.examWeight!==0.40)throw new Error('Ponderación 60/40 incorrecta');
if(c.scenarios.length!==14)throw new Error(`Se esperaban 14 supuestos y hay ${c.scenarios.length}`);
if(c.scenarios.filter(s=>s.stage==='demo').length!==3)throw new Error('Deben existir 3 supuestos demostrativos');
if(c.activityBank.length!==300)throw new Error(`El banco debe tener 300 actividades y tiene ${c.activityBank.length}`);
if(Object.keys(c.criteria).length!==9)throw new Error('RA2 debe contener 9 criterios');
const expected={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
for(const [ce,n] of Object.entries(expected)){
  const actual=c.activityBank.filter(a=>a.criterion===ce).length;
  if(actual!==n)throw new Error(`${ce}: se esperaban ${n} actividades y hay ${actual}`);
}
if(new Set(c.activityBank.map(a=>a.id)).size!==300)throw new Error('Hay IDs duplicados en el banco UD2');
for(const a of c.activityBank){
  if(!a.prompt||!Array.isArray(a.choices)||a.choices.length<3||!Number.isInteger(a.answerIndex))throw new Error(`Actividad incompleta: ${a.id}`);
}
const allowedIgic=new Set(['4727','4777']);
for(const code of Object.keys(c.accounts)){
  if(code.length===3)continue;
  if(allowedIgic.has(code))continue;
  throw new Error(`Cuenta fuera de la regla 3 dígitos/IGIC 4 dígitos: ${code}`);
}
for(const s of c.scenarios){
  if(!s.operations.length)throw new Error(`Supuesto ${s.id} sin operaciones`);
  for(const o of s.operations){
    const d=o.entries.reduce((a,x)=>a+x.debit,0),h=o.entries.reduce((a,x)=>a+x.credit,0);
    if(Math.abs(d-h)>.005)throw new Error(`Asiento descuadrado en ${o.id}: ${d} != ${h}`);
    for(const e of o.entries)if(!c.accounts[e.account])throw new Error(`Cuenta desconocida ${e.account} en ${o.id}`);
  }
}
console.log(`UD2 OK · ${c.scenarios.length} supuestos · ${c.scenarios.reduce((a,s)=>a+s.operations.length,0)} operaciones · ${c.activityBank.length} actividades · 9 criterios cubiertos`);
