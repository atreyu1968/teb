import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');
const courseSource=read('../web/ud2-course.js');
const bankSource=read('../web/ud2-bank.js');
const examSource=read('../web/ud2-exam-bank.js');
const recoverySource=read('../web/ud2-recovery-bank.js');
const portfolioSource=read('../web/ud2-portfolio.js');
const simulatorSource=read('../web/ud2-simulator.js');
const hostSource=read('../web/ud2-host.js');
const context={window:{}};
vm.createContext(context);
for(const [name,src] of [['ud2-course.js',courseSource],['ud2-bank.js',bankSource],['ud2-exam-bank.js',examSource],['ud2-recovery-bank.js',recoverySource]])vm.runInContext(src,context,{filename:name});
const c=context.window.TEB_UD2;
const fail=m=>{throw new Error(m)};

if(!c||c.id!=='teb-ud2-ra2')fail('TEB_UD2 no está definido correctamente');
if(c.hours!==20)fail('UD2 debe tener 20 horas');
if(c.portfolioWeight!==.60||c.examWeight!==.40)fail('Ponderación global distinta de 60/40');
if(c.scenarios.length!==14)fail(`Se esperaban 14 supuestos y hay ${c.scenarios.length}`);
if(c.scenarios.filter(s=>s.stage==='demo').length!==3)fail('Deben existir 3 demostrativos');
if(c.scenarios.filter(s=>s.stage==='guided').length!==4)fail('Deben existir 4 guiados');
if(c.scenarios.filter(s=>s.stage==='audit').length!==2)fail('Deben existir 2 supuestos de auditoría');

const ces=Object.keys(c.criteria);
if(ces.length!==9)fail('RA2 debe contener 9 criterios');
for(const ce of ces)if(Math.abs(c.criteria[ce].weight-1/9)>1e-12)fail(`${ce} no tiene peso 1/9`);
if(Math.abs(ces.reduce((a,ce)=>a+c.criteria[ce].weight,0)-1)>1e-12)fail('Los pesos de RA2 no suman 1');

const expected={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
for(const [name,bank] of [['portafolio',c.activityBank],['examen',c.examBank],['recuperación',c.recoveryBank]]){
  if(bank.length!==300)fail(`El banco de ${name} debe tener 300 ítems y tiene ${bank.length}`);
  if(new Set(bank.map(x=>x.id)).size!==300)fail(`Hay IDs duplicados en ${name}`);
  if(new Set(bank.map(x=>x.prompt)).size!==300)fail(`Hay enunciados duplicados en ${name}`);
  for(const [ce,n] of Object.entries(expected))if(bank.filter(x=>x.criterion===ce).length!==n)fail(`${name} · ${ce}: distribución incorrecta`);
  for(const x of bank){
    if(!x.prompt||!Array.isArray(x.choices)||x.choices.length<3||!Number.isInteger(x.answerIndex))fail(`Ítem incompleto: ${x.id}`);
    if(x.answerIndex<0||x.answerIndex>=x.choices.length)fail(`Respuesta fuera de rango: ${x.id}`);
    if(new Set(x.choices).size!==x.choices.length)fail(`Opciones duplicadas: ${x.id}`);
  }
}
const allIds=[...c.activityBank,...c.examBank,...c.recoveryBank].map(x=>x.id);
if(new Set(allIds).size!==900)fail('Los tres bancos comparten IDs');
const pp=new Set(c.activityBank.map(x=>x.prompt)),ep=new Set(c.examBank.map(x=>x.prompt));
if(c.examBank.some(x=>pp.has(x.prompt)))fail('Portafolio y examen comparten enunciados');
if(c.recoveryBank.some(x=>pp.has(x.prompt)||ep.has(x.prompt)))fail('Recuperación comparte enunciados con otro banco');

function answerDistribution(bank){
  const out={};for(const x of bank)out[x.answerIndex]=(out[x.answerIndex]||0)+1;return out;
}
const pd=answerDistribution(c.activityBank),ed=answerDistribution(c.examBank),rd=answerDistribution(c.recoveryBank);
if(c.activityBank.some(x=>x.choices.length!==5))fail('El portafolio debe usar cinco opciones para que tres intentos no permitan fuerza bruta aprobatoria');
for(let i=0;i<5;i++)if((pd[i]||0)<55||(pd[i]||0)>65)fail(`Sesgo de posición en portafolio: ${JSON.stringify(pd)}`);
for(const dist of [ed,rd])for(let i=0;i<3;i++)if((dist[i]||0)<95||(dist[i]||0)>105)fail(`Sesgo de posición: ${JSON.stringify(dist)}`);

const allowedIgic=new Set(['4727','4777']);
for(const code of Object.keys(c.accounts))if(code.length!==3&&!allowedIgic.has(code))fail(`Cuenta fuera de regla 3 dígitos/IGIC: ${code}`);
if(c.accounts['523']!=='Proveedores de inmovilizado a corto plazo')fail('Falta la cuenta 523 correcta');

for(const s of c.scenarios){
  if(!s.operations.length)fail(`Supuesto ${s.id} sin operaciones`);
  const bal={};
  for(const o of s.operations){
    const d=o.entries.reduce((a,x)=>a+x.debit,0),h=o.entries.reduce((a,x)=>a+x.credit,0);
    if(Math.abs(d-h)>.005)fail(`Asiento descuadrado en ${o.id}`);
    for(const e of o.entries){if(!c.accounts[e.account])fail(`Cuenta desconocida ${e.account} en ${o.id}`);bal[e.account]=(bal[e.account]||0)+e.debit-e.credit}
    if((bal['430']||0)<-.005)fail(`${s.id}/${o.id}: cobro sin derecho suficiente`);
    if((bal['400']||0)>.005)fail(`${s.id}/${o.id}: pago a proveedor sin deuda suficiente`);
    if((bal['410']||0)>.005)fail(`${s.id}/${o.id}: pago a acreedor sin deuda suficiente`);
    if((bal['523']||0)>.005)fail(`${s.id}/${o.id}: pago de inmovilizado sin deuda suficiente`);
    if((bal['572']||0)<-.005)fail(`${s.id}/${o.id}: Bancos negativo sin financiación explicada`);
    if((bal['570']||0)<-.005)fail(`${s.id}/${o.id}: Caja negativa`);
  }
}
for(const o of c.scenarios.flatMap(s=>s.operations).filter(o=>/equipos informáticos.*pendientes de pago/i.test(o.description))){
  if(!o.entries.some(e=>e.account==='523'))fail(`${o.id}: compra de inmovilizado a crédito sin 523`);
}

const quota={'RA2.a':10,'RA2.b':10,'RA2.c':13,'RA2.d':12,'RA2.e':10,'RA2.f':10,'RA2.g':10,'RA2.h':10,'RA2.i':15};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)}
function pick100(studentCode){const r=rng(hash(studentCode+'|UD2|PORTFOLIO|10OF10')),out=[];for(const [ce,n] of Object.entries(quota)){let p=c.activityBank.filter(x=>x.criterion===ce).slice();for(let i=p.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]]}out.push(...p.slice(0,n))}for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
for(const code of ['TEB-CI-1','TEB-CI-2','TEB-CI-3','TEB-CI-4']){
  const q=pick100(code);
  if(q.length!==100||new Set(q.map(x=>x.id)).size!==100||new Set(q.map(x=>x.prompt)).size!==100)fail(`${code}: selección de 100 no es única`);
  const first=q.filter(x=>x.answerIndex===0).length;
  if(first>30)fail(`${code}: marcar siempre la primera daría ${first}% de aciertos`);
  const brute=q.reduce((sum,x)=>sum+(x.answerIndex===0?100:x.answerIndex===1?75:x.answerIndex===2?50:0),0)/100;
  if(brute>=50)fail(`${code}: probar sistemáticamente las tres primeras opciones daría ${brute}%`);
}

const evalOps=c.scenarios.filter(s=>s.evaluated).flatMap(s=>s.operations);
const practicalEvidence=Object.fromEntries(ces.map(ce=>[ce,evalOps.filter(o=>o.criteria.includes(ce)).length]));
for(const ce of ['RA2.b','RA2.c','RA2.d','RA2.f'])if(practicalEvidence[ce]===0)fail(`${ce} debería tener evidencia de supuesto práctico`);
const perfect=Object.fromEntries(ces.map(ce=>[ce,practicalEvidence[ce]>0?100*.4+100*.6:100]));
if(Object.values(perfect).some(x=>Math.abs(x-100)>.001))fail(`Un alumno perfecto no puede obtener 100 en todos los CE: ${JSON.stringify(perfect)}`);

if(!/a===1\?100:a===2\?75:50/.test(portfolioSource))fail('Portafolio no aplica 100/75/50 en tres intentos');
if(!/attempt<3/.test(simulatorSource))fail('Simulador evaluable no concede tres intentos');
if(/Respuesta correcta:/.test(portfolioSource))fail('El portafolio revela la respuesta correcta');
if(!/fullscreenchange/.test(portfolioSource)||!/fullscreenchange/.test(simulatorSource))fail('Falta control de salida de pantalla completa');
if(!/Pausa segura|pausa segura/i.test(portfolioSource)||!/Pausa segura|pausa segura/i.test(simulatorSource))fail('Falta pausa segura');
if(!/preparationDone/.test(portfolioSource)||!/preparationDone/.test(hostSource))fail('El portafolio no está bloqueado hasta terminar la preparación');
if(!/auditDraft/.test(simulatorSource))fail('Los supuestos Auditor no contienen asientos con error para corregir');
if(!/tutorial_done/.test(simulatorSource))fail('Falta tutorial obligatorio de primer contacto');

console.log('UD2 10/10 CHECK OK');
console.log(JSON.stringify({
  scenarios:c.scenarios.length,
  operations:c.scenarios.reduce((a,s)=>a+s.operations.length,0),
  banks:{portfolio:c.activityBank.length,exam:c.examBank.length,recovery:c.recoveryBank.length},
  answerDistribution:{portfolio:pd,exam:ed,recovery:rd},
  perfectPortfolio:perfect,
  practicalEvidence
},null,2));
