const API='';
const C=window.TEB_COURSE;
let token=localStorage.getItem('teb_student_token')||'';
let profile=null;
let progress={state:{completedSessions:[],scores:{},attempts:{},scormData:{}},score:0,completion:0,timeSeconds:0,currentSession:1,status:'not-started',criteria:[]};
let current=1,lastTick=Date.now(),saveTimer=null,activeScorm=null;
const $=id=>document.getElementById(id);
const courseQuery=()=>`?courseId=${encodeURIComponent(C.id)}`;

const SCORM_PACKS={
  'micro-scorm-de':{src:'reutilizados/micro-scorm-de/index.html',title:'Micropráctica 3 · Patrimonio y masas patrimoniales',ref:'micro-scorm-de',criteria:['RA1.d','RA1.e']},
  'micro-scorm-f':{src:'reutilizados/micro-scorm-f/index.html',title:'Micropráctica 4 · Estructura económica y financiera',ref:'micro-scorm-f',criteria:['RA1.f']},
  'micro-scorm-g':{src:'reutilizados/micro-scorm-g/index.html',title:'Micropráctica 5 · Clasificación patrimonial',ref:'micro-scorm-g',criteria:['RA1.g']}
};

async function req(path,opt={}){const headers={'Content-Type':'application/json',...(opt.headers||{})};if(token)headers.Authorization='Bearer '+token;const r=await fetch(API+path,{...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Error de comunicación');return d}
function msg(text,bad=false){const e=$('authMsg');e.textContent=text;e.className='notice '+(bad?'error':'')}
function clampScore(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null}

async function init(){try{const s=await req('/api/setup-status');$('setupBox').classList.toggle('hidden',!s.needsSetup);$('loginBox').classList.toggle('hidden',s.needsSetup)}catch(e){msg('No se puede conectar con el servidor TEB.',true)}if(token){try{const m=await req('/api/me');profile=m.profile;await enterCourse()}catch{localStorage.removeItem('teb_student_token');token=''}}}
$('setupBtn').onclick=async()=>{try{const d=await req('/api/setup',{method:'POST',body:JSON.stringify({username:$('setupUser').value,password:$('setupPass').value})});localStorage.setItem('teb_admin_token',d.token);location.href='admin.html'}catch(e){msg(e.message,true)}};
$('studentLogin').onclick=async()=>{try{const d=await req('/api/login',{method:'POST',body:JSON.stringify({role:'student',code:$('studentCode').value,pin:$('studentPin').value})});token=d.token;profile=d.profile;localStorage.setItem('teb_student_token',token);await enterCourse()}catch(e){msg(e.message,true)}};
$('logoutBtn').onclick=()=>{localStorage.removeItem('teb_student_token');location.reload()};

async function enterCourse(){
  progress=await req('/api/progress'+courseQuery());progress.state=progress.state||{};
  progress.state.completedSessions=progress.state.completedSessions||[];progress.state.scores=progress.state.scores||{};progress.state.attempts=progress.state.attempts||{};progress.state.scormData=progress.state.scormData||{};
  current=progress.currentSession||1;$('auth').classList.add('hidden');$('courseApp').classList.remove('hidden');$('studentName').textContent=`${profile.firstName} ${profile.lastName}`;$('profileName').textContent=`${profile.firstName} ${profile.lastName}`;$('profileGroup').textContent=`${profile.code}${profile.groupName?' · '+profile.groupName:''}`;$('courseTitle').textContent=C.title;renderNav();renderSession(current);updateMetrics();renderCriteria();lastTick=Date.now();clearInterval(saveTimer);saveTimer=setInterval(tickSave,30000)
}
function tickSave(){const now=Date.now();progress.timeSeconds+=(now-lastTick)/1000;lastTick=now;saveProgress()}
function completed(){return new Set(progress.state.completedSessions)}
function renderNav(){const done=completed();$('sessionNav').innerHTML='';C.sessions.forEach(s=>{const b=document.createElement('button');b.className='nav-item'+(s.n===current?' active':'')+(done.has(s.n)?' done':'');b.innerHTML=`<strong>${done.has(s.n)?'✓ ':''}Bloque ${s.n}</strong><small>${s.title}</small>`;b.onclick=()=>{current=s.n;progress.currentSession=current;renderNav();renderSession(current);saveProgress()};$('sessionNav').appendChild(b)})}
function renderSession(n){const s=C.sessions[n-1],score=progress.state.scores[n];const theory=s.theory.map((x,i)=>`<div class="theory-point"><strong>${i+1}.</strong> ${x}</div>`).join('');$('content').innerHTML=`<section class="session-card"><div class="muted">Bloque ${s.n} · ${s.min} min orientativos</div><h2>${s.title}</h2><div class="chips">${s.ce.map(x=>`<span class="chip">${x}</span>`).join('')}</div><h3>Ideas que debes comprender</h3><div class="theory-grid">${theory}</div><div class="task"><strong>Evidencia de aprendizaje</strong><p>${s.task}</p></div>${score!=null?`<div class="notice">Mejor puntuación de este bloque: <strong>${score}%</strong></div>`:''}<div class="actions"><button class="btn" id="practiceBtn">Abrir práctica autocorregible</button><button class="btn secondary" id="studyBtn">He revisado la explicación</button></div><div id="quizArea"></div></section>`;$('practiceBtn').onclick=()=>startPractice(s);$('studyBtn').onclick=()=>logEvent('theory-reviewed',`session-${s.n}`,null,null,{session:s.n})}

function startPractice(s){
  if(SCORM_PACKS[s.practice])return openScorm(SCORM_PACKS[s.practice]);
  if(s.practice==='basic-game')return openActivity('reutilizados/patrimonio-basico.html','Juego básico · Activo, pasivo y patrimonio neto');
  if(s.practice==='advanced-game')return openActivity('reutilizados/patrimonio-avanzado.html','Entrenamiento avanzado · Masas patrimoniales');
  renderQuiz(s)
}
function openActivity(src,title){activeScorm=null;$('modalTitle').textContent=title;$('activityFrame').setAttribute('allow','fullscreen');$('activityFrame').src=src;$('activityModal').classList.remove('hidden')}
function openScorm(pack){
  const saved=progress.state.scormData[pack.ref]||{};
  activeScorm={...pack,session:current,values:{'cmi.core.lesson_status':saved.status||'not attempted','cmi.core.score.raw':saved.score??'','cmi.core.lesson_location':saved.location||'','cmi.suspend_data':saved.suspendData||''},initialized:false,lastSignature:'',completedLogged:false};
  $('modalTitle').textContent=pack.title;$('activityFrame').setAttribute('allow','fullscreen');$('activityFrame').src=pack.src;$('activityModal').classList.remove('hidden')
}
$('closeModal').onclick=()=>{if(activeScorm)captureScormCommit('close');$('activityModal').classList.add('hidden');$('activityFrame').src='about:blank';setTimeout(()=>{activeScorm=null},0)};

function scormValue(key){
  if(!activeScorm)return'';
  if(key==='cmi.core.student_id')return profile?.code||'';
  if(key==='cmi.core.student_name')return profile?`${profile.lastName}, ${profile.firstName}`:'';
  if(key==='cmi.core.entry')return activeScorm.values['cmi.suspend_data']?'resume':'ab-initio';
  if(key==='cmi.objectives._count')return String(activeScorm.criteria.length);
  if(key==='cmi.interactions._count')return '0';
  return activeScorm.values[key]??'';
}
function scormSet(key,value){if(!activeScorm)return'false';activeScorm.values[key]=String(value??'');return'true'}
window.API={
  LMSInitialize(){if(!activeScorm)return'false';activeScorm.initialized=true;return'true'},
  LMSFinish(){if(!activeScorm)return'false';captureScormCommit('finish');activeScorm.initialized=false;return'true'},
  LMSGetValue(key){return scormValue(key)},
  LMSSetValue(key,value){return scormSet(key,value)},
  LMSCommit(){if(!activeScorm)return'false';captureScormCommit('commit');return'true'},
  LMSGetLastError(){return'0'},LMSGetErrorString(){return'No error'},LMSGetDiagnostic(){return''}
};

function objectiveScore(ctx,index){return clampScore(ctx.values[`cmi.objectives.${index}.score.raw`])}
function persistScormState(ctx,score,status){
  progress.state.scormData[ctx.ref]={score:score??'',status:status||'incomplete',location:ctx.values['cmi.core.lesson_location']||'',suspendData:ctx.values['cmi.suspend_data']||'',updatedAt:new Date().toISOString()}
}
function captureScormCommit(reason){
  const ctx=activeScorm;if(!ctx)return;
  const score=clampScore(ctx.values['cmi.core.score.raw']);const status=ctx.values['cmi.core.lesson_status']||'incomplete';
  const objectives=ctx.criteria.map((ce,i)=>({ce,score:objectiveScore(ctx,i)??score}));
  const signature=JSON.stringify([status,score,objectives.map(x=>x.score),ctx.values['cmi.core.lesson_location']||'',ctx.values['cmi.suspend_data']||'']);
  persistScormState(ctx,score,status);
  if(score!=null)progress.state.scores[ctx.session]=Math.max(progress.state.scores[ctx.session]||0,score);
  if(signature===ctx.lastSignature){saveProgress();return}ctx.lastSignature=signature;
  objectives.forEach(x=>{if(x.score!=null)logEvent('scorm-objective',ctx.ref,x.ce,x.score,{session:ctx.session,reason,status,scorm:'1.2'})});
  if(status==='completed'&&!ctx.completedLogged){ctx.completedLogged=true;progress.state.attempts[ctx.session]=(progress.state.attempts[ctx.session]||0)+1;markSessionDone(ctx.session);logEvent('scorm-completed',ctx.ref,null,score,{session:ctx.session,status,scorm:'1.2',formative:true})}
  else logEvent('scorm-commit',ctx.ref,null,score,{session:ctx.session,status,reason,scorm:'1.2'});
  saveProgress();updateMetrics();renderCriteria()
}

const BANK={
'RA1.a':[['¿Qué suele iniciar el ciclo económico de una empresa?',['La obtención de financiación','El cierre contable','El cobro de todas las ventas'],0],['Después de obtener financiación, una empresa suele destinar recursos a…',['realizar inversiones y adquirir medios','liquidar la empresa','eliminar sus activos'],0],['La venta y el cobro…',['pueden producirse en momentos distintos','son siempre simultáneos','significan exactamente lo mismo'],0],['En un ciclo económico comercial, comprar mercaderías se sitúa antes de…',['venderlas','financiarse siempre','constituir la empresa necesariamente'],0]],
'RA1.b':[['Comprar un ordenador para usarlo varios años es principalmente…',['una inversión','un cobro','una financiación'],0],['Recibir un préstamo bancario representa…',['financiación','gasto','pago'],0],['Consumir electricidad durante el mes representa…',['un gasto','una inversión financiera','un cobro'],0],['Pagar hoy una factura registrada el mes pasado es…',['un pago','un gasto nuevo necesariamente','un ingreso'],0],['Vender a crédito produce…',['un ingreso aunque todavía no se haya cobrado','un cobro inmediato','un pago'],0]],
'RA1.c':[['Una explotación platanera pertenece al sector…',['primario','secundario','terciario'],0],['Un hotel desarrolla principalmente actividad del sector…',['terciario','primario','secundario'],0],['Una fábrica que transforma materias primas pertenece al sector…',['secundario','primario','terciario'],0],['Una asesoría administrativa presta…',['servicios del sector terciario','actividad extractiva','actividad industrial'],0]],
'RA1.d':[['El patrimonio empresarial está formado por…',['bienes, derechos y obligaciones','solo dinero','solo bienes físicos'],0],['Una deuda con un proveedor es…',['una obligación','un derecho de cobro','un bien'],0],['El dinero que debe un cliente a la empresa es…',['un derecho','una obligación','patrimonio neto'],0],['Una masa patrimonial es…',['una agrupación de elementos con función económica semejante','una factura','un único elemento patrimonial'],0]],
'RA1.e':[['Caja se clasifica en…',['activo','pasivo','patrimonio neto'],0],['Capital social se clasifica en…',['patrimonio neto','activo corriente','pasivo corriente'],0],['Un préstamo que la empresa debe al banco pertenece al…',['pasivo','activo','ingreso'],0],['Clientes pendientes de cobro se clasifica en…',['activo','pasivo','patrimonio neto'],0],['Mercaderías destinadas a venderse forman parte del…',['activo corriente','activo no corriente','pasivo corriente'],0]],
'RA1.f':[['La inversión en maquinaria suele aumentar inicialmente…',['el activo','el pasivo siempre','los ingresos'],0],['Obtener financiación ajena suele originar…',['un recurso en activo y una obligación en pasivo','solo un gasto','solo un ingreso'],0],['Cobrar a un cliente pendiente transforma…',['un derecho de cobro en tesorería','un pasivo en patrimonio neto','un gasto en inversión'],0],['Pagar a un proveedor pendiente reduce…',['tesorería y una obligación','capital social','clientes'],0]],
'RA1.g':[['¿Cuál está mejor ordenado dentro del activo?',['No corriente y después corriente','Pasivo y después activo','Patrimonio neto y después ingresos'],0],['Una deuda bancaria a 5 años se clasifica como…',['pasivo no corriente','pasivo corriente','activo no corriente'],0],['Una deuda que vence en 3 meses es…',['pasivo corriente','patrimonio neto','activo corriente'],0],['Un vehículo utilizado durante varios años es…',['activo no corriente','activo corriente','pasivo no corriente'],0],['Para clasificar correctamente conviene atender a…',['naturaleza, función y plazo','si la palabra parece positiva o negativa','solo si entra o sale dinero'],0]]};
function quizQuestions(s){let all=[];s.ce.forEach(ce=>(BANK[ce]||[]).forEach((q,i)=>all.push({ce,q:q[0],opts:q[1],ok:q[2],key:ce+'-'+i})));all=all.sort(()=>Math.random()-.5);const count=s.n>=12?14:Math.min(8,all.length);return all.slice(0,count)}
function renderQuiz(s){const qs=quizQuestions(s),area=$('quizArea');area.innerHTML=`<div class="panel" style="padding:16px;margin-top:18px"><h3>Práctica autocorregible</h3><p class="muted">${qs.length} preguntas · necesitas 70 % para superar el bloque.</p><form id="quizForm">${qs.map((q,i)=>`<fieldset style="border:0;border-top:1px solid #e3eaf0;padding:14px 0"><legend><strong>${i+1}. ${q.q}</strong> <span class="chip">${q.ce}</span></legend>${q.opts.map((o,j)=>`<label style="display:block;padding:7px"><input type="radio" name="q${i}" value="${j}"> ${o}</label>`).join('')}</fieldset>`).join('')}<button class="btn" type="submit">Corregir práctica</button></form><div id="quizResult"></div></div>`;$('quizForm').onsubmit=async e=>{e.preventDefault();let correct=0;const by={};qs.forEach((q,i)=>{const v=new FormData(e.target).get('q'+i);const ok=Number(v)===q.ok;if(ok)correct++;by[q.ce]=by[q.ce]||{n:0,c:0};by[q.ce].n++;if(ok)by[q.ce].c++});const score=Math.round(correct/qs.length*100);progress.state.attempts[s.n]=(progress.state.attempts[s.n]||0)+1;progress.state.scores[s.n]=Math.max(progress.state.scores[s.n]||0,score);for(const [ce,v] of Object.entries(by))await logEvent('criterion-practice',`session-${s.n}`,ce,Math.round(v.c/v.n*100),{session:s.n});await logEvent('session-practice',`session-${s.n}`,null,score,{session:s.n,attempt:progress.state.attempts[s.n]});if(score>=70)markSessionDone(s.n);$('quizResult').innerHTML=`<div class="notice ${score>=70?'':'error'}">Resultado: <strong>${score}%</strong> · ${correct}/${qs.length}. ${score>=70?'Bloque superado.':'Revisa la explicación y vuelve a intentarlo.'}</div>`;renderSession(s.n);await saveProgress()}}
function markSessionDone(n){const set=completed();set.add(n);progress.state.completedSessions=[...set].sort((a,b)=>a-b);progress.completion=Math.round(set.size/C.sessions.length*100);if(n<C.sessions.length)progress.currentSession=Math.max(progress.currentSession||1,n+1);progress.status=progress.completion===100?'completed':'incomplete';const scores=Object.values(progress.state.scores).map(Number);progress.score=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;renderNav();updateMetrics()}
async function logEvent(eventType,ref,criterion,score,payload={}){try{await req('/api/events',{method:'POST',body:JSON.stringify({courseId:C.id,eventType,ref,criterion,score,payload})});if(criterion&&score!=null){const old=progress.criteria.find(x=>x.criterion===criterion);if(old){old.score=Math.max(old.score,score);old.completed=old.score>=50?1:old.completed;old.attempts=(old.attempts||0)+1}else progress.criteria.push({criterion,score,completed:score>=50?1:0,attempts:1})}renderCriteria()}catch(e){console.error(e)}}
async function submitAssessment(instrument,criterionScores,ref,payload={}){return req('/api/assessment',{method:'POST',body:JSON.stringify({courseId:C.id,instrument,criteria:criterionScores,ref,payload})})}
window.addEventListener('message',async e=>{const d=e.data;if(!d)return;if(d.type==='teb-assessment-result'){try{const r=await submitAssessment(d.instrument,d.criteriaScores||{},d.ref||d.instrument,d.payload||{});progress.criteria=Object.entries(r.criteria||{}).map(([criterion,x])=>({criterion,score:x.score,completed:x.passed?1:0,attempts:1}));renderCriteria()}catch(err){console.error(err)}return}if(d.type!=='teb-activity-result')return;progress.state.attempts[current]=(progress.state.attempts[current]||0)+1;progress.state.scores[current]=Math.max(progress.state.scores[current]||0,d.score||0);for(const ce of d.criteria||[])await logEvent('reused-activity',d.ref,ce,d.score,{session:current,attempts:d.attempts||1,errorType:d.errorType||''});if(d.complete)markSessionDone(current);await logEvent('activity-result',d.ref,null,d.score,{session:current,complete:!!d.complete});await saveProgress();updateMetrics();renderSession(current)});
async function saveProgress(){if(!token)return;$('saveState').textContent='Guardando…';const scores=Object.values(progress.state.scores).map(Number);progress.score=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;progress.completion=Math.round(completed().size/C.sessions.length*100);try{await req('/api/progress',{method:'PUT',body:JSON.stringify({courseId:C.id,version:C.version,state:progress.state,score:progress.score,completion:progress.completion,timeSeconds:Math.round(progress.timeSeconds),currentSession:progress.currentSession||current,status:progress.status||'incomplete'})});$('saveState').textContent='Guardado'}catch{$('saveState').textContent='Sin guardar'}}
function updateMetrics(){$('overallPct').textContent=(progress.completion||0)+'%';$('overallBar').style.width=(progress.completion||0)+'%';$('overallScore').textContent=Math.round(progress.score||0);$('timeSpent').textContent=(progress.timeSeconds/3600).toFixed(1)+'h'}
function renderCriteria(){const map=new Map((progress.criteria||[]).map(x=>[x.criterion,x]));$('criteriaGrid').innerHTML=Object.entries(C.criteria).map(([ce,desc])=>{const p=map.get(ce),score=p?Math.round(p.score):0;return `<div class="criterion ${score>=50?'ok':'pending'}"><strong>${ce}</strong><div class="score">${score}%</div><div class="muted">${desc}</div><small>${p?.attempts||0} evidencias registradas</small></div>`}).join('')}
window.addEventListener('beforeunload',()=>{const now=Date.now();progress.timeSeconds+=(now-lastTick)/1000;lastTick=now;if(activeScorm)captureScormCommit('unload')});
init();
