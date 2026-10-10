(()=>{
  const C=window.TEB_UD2,$=id=>document.getElementById(id),COURSE_ID='teb-ud2-ra2',STORE='teb_ud2_portfolio_v1',BANK_VERSION='ud2-p10-v1';
  if(!C?.activityBank)throw new Error('No se ha cargado el banco de actividades UD2');
  const quota={'RA2.a':10,'RA2.b':10,'RA2.c':13,'RA2.d':12,'RA2.e':10,'RA2.f':10,'RA2.g':10,'RA2.h':10,'RA2.i':15};
  const freshState=()=>({bankVersion:BANK_VERSION,ids:[],index:0,attempts:{},scores:{},violations:{},submitted:false,submittedAt:null});
  let token=localStorage.getItem('teb_student_token')||'',profile=null,progress=null,selected=[],state=freshState();
  let secureActive=false,safePause=true,pendingAdvance=null;

  async function req(path,opt={}){const h={'Content-Type':'application/json',...(opt.headers||{})};if(token)h.Authorization='Bearer '+token;const r=await fetch(path,{...opt,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Error de comunicación');return d}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){return()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)}
  function pick100(studentCode){const r=rng(hash(studentCode+'|UD2|PORTFOLIO|10OF10')),out=[];for(const [ce,n] of Object.entries(quota)){let p=C.activityBank.filter(x=>x.criterion===ce).slice();for(let i=p.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]]}out.push(...p.slice(0,n))}for(let i=out.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
  function localState(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return{}}}
  function saveLocal(){localStorage.setItem(STORE,JSON.stringify(state))}
  async function saveServer(){saveLocal();progress.state={...(progress.state||{}),portfolioState:state};await req('/api/progress',{method:'PUT',body:JSON.stringify({courseId:COURSE_ID,version:'1.0.0',state:progress.state,score:progress.score||0,completion:progress.completion||0,timeSeconds:progress.timeSeconds||0,currentSession:progress.currentSession||1,status:progress.status||'incomplete'})})}

  function hintFor(q,attempt){
    const h1={
      'RA2.a':'Sitúa primero la situación en el inicio, desarrollo o final del ejercicio.',
      'RA2.b':'Describe con palabras qué bien, derecho, obligación, gasto o ingreso aparece antes de pensar en el código.',
      'RA2.c':'Busca todos los efectos del hecho y verifica que Debe y Haber mantienen el equilibrio.',
      'RA2.d':'Decide primero si la cuenta aumenta o disminuye y cuál es su naturaleza; sólo después decide Debe/Haber.',
      'RA2.e':'Separa dos preguntas: ¿cuadra aritméticamente? ¿las cuentas elegidas tienen sentido?',
      'RA2.f':'Identifica si la cuenta representa consumo/gasto o generación de ingreso; no la confundas con el pago o el cobro.',
      'RA2.g':'Resultado = ingresos − gastos. Observa el signo del resultado.',
      'RA2.h':'Piensa qué ocurre al terminar un ejercicio y qué debe pasar al comenzar el siguiente.',
      'RA2.i':'Distingue los libros de registro de las cuentas anuales y piensa qué información ofrece cada documento.'
    }[q.criterion];
    if(attempt<=1)return h1;
    if(attempt===2)return `Descarta las opciones incompatibles con «${C.criteria[q.criterion]?.label||q.criterion}». Después justifica mentalmente cada opción que quede.`;
    return 'Vuelve al procedimiento de la unidad y razona desde el hecho económico. No busques una palabra aislada: comprueba que toda la explicación sea coherente.';
  }

  function sim(){return progress?.state?.simulatorState||{}}
  function preparationDone(){const done=new Set(sim().completedScenarios||[]);return [1,2,3,4,5,6,7].every(x=>done.has(x))}
  function casesDone(){const done=new Set(sim().completedScenarios||[]);return [8,9,10,11,12,13,14].every(x=>done.has(x))}
  function caseScoresByCriterion(){const ev=sim().criterionEvidence||{},out={};Object.keys(C.criteria).forEach(ce=>{const x=ev[ce];out[ce]=x?.count?x.sum/x.count:null});return out}
  function microScores(){const out={};Object.keys(C.criteria).forEach(ce=>out[ce]=[]);selected.forEach(q=>{if(state.scores[q.id]!=null)out[q.criterion].push(Number(state.scores[q.id]))});const r={};for(const ce of Object.keys(out))r[ce]=out[ce].length?out[ce].reduce((a,b)=>a+b,0)/out[ce].length:0;return r}
  function portfolioScores(){const m=microScores(),c=caseScoresByCriterion(),r={};for(const ce of Object.keys(C.criteria))r[ce]=Math.round((c[ce]==null?m[ce]:m[ce]*.4+c[ce]*.6)*100)/100;return r}
  function avg(obj){const vals=Object.values(obj);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0}
  function doneCount(){return Object.keys(state.scores).length}
  function currentQuestion(){let q=selected[state.index];while(q&&state.scores[q.id]!=null&&state.index<99){state.index++;q=selected[state.index]}return q}

  function fullscreenSupported(){return !!document.fullscreenEnabled}
  async function enterFullscreen(){if(fullscreenSupported()&&!document.fullscreenElement)await document.documentElement.requestFullscreen()}
  function hideSecure(){$('secureOverlay').classList.add('hidden')}
  function showSecure(title,text,advance=null){safePause=true;secureActive=false;pendingAdvance=advance;$('secureTitle').textContent=title;$('secureText').textContent=text;$('secureOverlay').classList.remove('hidden');$('secureEnterBtn').onclick=async()=>{try{await enterFullscreen();safePause=false;secureActive=true;hideSecure();const fn=pendingAdvance;pendingAdvance=null;if(fn)await fn()}catch{$('secureText').textContent='El navegador no ha permitido la pantalla completa. Pulsa de nuevo para continuar.'}}}
  async function advanceQuestion(){state.index=Math.min(99,state.index+1);await saveServer();renderAll()}
  async function safeNext(){secureActive=false;safePause=true;if(doneCount()>=100){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});await saveServer();renderAll();return}showSecure('Pausa segura','La actividad anterior ya está consolidada. Puedes salir de pantalla completa sin penalización. La siguiente pregunta no se activará hasta que pulses el botón.',advanceQuestion)}
  async function penalizeCurrent(reason){if(!secureActive||safePause||state.submitted)return;const q=currentQuestion();if(!q)return;secureActive=false;state.scores[q.id]=0;state.violations[q.id]=(state.violations[q.id]||0)+1;await saveServer();renderProgress();showSecure('Actividad anulada · 0 puntos',reason+' La siguiente actividad permanecerá oculta hasta que vuelvas a entrar en pantalla completa.',advanceQuestion)}

  function renderQuestion(){
    const done=doneCount();$('bar').style.width=`${done}%`;$('counter').textContent=`${done} / 100 actividades completadas`;
    if(!preparationDone()){$('question').innerHTML='<h2>Portafolio todavía bloqueado</h2><p>Completa primero los 3 supuestos demostrativos y los 4 guiados del simulador. Es la preparación obligatoria antes de empezar la evaluación.</p>';$('hint').classList.add('hidden');$('feedback').className='hidden';return}
    if(state.submitted){$('question').innerHTML='<h2>Portafolio entregado</h2><p>La entrega está cerrada. Consulta abajo el resultado por criterios.</p>';$('hint').classList.add('hidden');$('feedback').className='hidden';return}
    if(done>=100){$('question').innerHTML='<h2>Microactividades completadas</h2><p>Has terminado las 100 actividades. Para entregar el portafolio deben estar completados también los siete supuestos evaluables.</p>';$('hint').classList.add('hidden');$('feedback').className='hidden';return}
    const q=currentQuestion();if(!q)return;const attempts=state.attempts[q.id]||0;
    $('question').innerHTML=`<span class="chip">${q.criterion}</span><h2>Actividad ${done+1}</h2><h3>${q.prompt}</h3>${q.choices.map((o,i)=>`<label class="option"><input type="radio" name="ans" value="${i}"> ${o}</label>`).join('')}<button id="checkBtn" class="btn">Comprobar</button>`;
    $('hint').classList.toggle('hidden',attempts===0);if(attempts)$('hint').textContent=hintFor(q,attempts);$('feedback').className='hidden';$('checkBtn').onclick=()=>check(q);
  }

  async function check(q){
    const pick=document.querySelector('input[name=ans]:checked');if(!pick)return;
    const a=(state.attempts[q.id]||0)+1;state.attempts[q.id]=a;const ok=Number(pick.value)===q.answerIndex;
    if(ok){
      state.scores[q.id]=a===1?100:a===2?75:50;
      $('feedback').className='good';$('feedback').innerHTML=`Correcto. Has aplicado el criterio ${q.criterion} con una puntuación de ${state.scores[q.id]} %. <button id="nextBtn" class="btn">Siguiente</button>`;
      $('checkBtn').disabled=true;$('nextBtn').onclick=safeNext;await saveServer();
    }else if(a<3){
      $('hint').classList.remove('hidden');$('hint').textContent=hintFor(q,a);$('feedback').className='bad';$('feedback').textContent=`Todavía no es correcto. Revisa la pista: te queda${a===1?'n dos intentos':' un intento'}.`;await saveServer();
    }else{
      state.scores[q.id]=0;$('hint').classList.remove('hidden');$('hint').textContent=hintFor(q,3);$('feedback').className='bad';$('feedback').innerHTML='Has agotado los tres intentos. La actividad queda con 0 puntos. La respuesta correcta no se muestra. <button id="nextBtn" class="btn">Siguiente</button>';$('checkBtn').disabled=true;$('nextBtn').onclick=safeNext;await saveServer();
    }
    renderProgress();
  }

  function renderCases(){const done=new Set(sim().completedScenarios||[]);$('caseStatus').innerHTML=[8,9,10,11,12,13,14].map(id=>{const x=C.scenarios.find(s=>s.id===id),ok=done.has(id);return `<div class="${ok?'good':'bad'}" style="margin:6px 0"><strong>${ok?'✓':'○'} ${id}. ${x?.title||'Supuesto'}</strong>${ok?` · ${Math.round(sim().scenarioScores?.[id]||0)}%`:' · pendiente'}</div>`}).join('')}
  function renderProgress(){
    const m=microScores(),c=caseScoresByCriterion(),p=portfolioScores();
    $('criteria').innerHTML=Object.entries(C.criteria).map(([ce,x])=>`<div class="criterion"><strong>${ce}</strong><p>${x.label}</p><small>Microactividades: ${m[ce].toFixed(1)}%</small><br><small>Supuestos: ${c[ce]==null?'No aplica en este CE':c[ce].toFixed(1)+'%'}</small><p><b>Portafolio: ${p[ce].toFixed(1)}%</b></p></div>`).join('');
    const complete=doneCount()===100,cases=casesDone();
    if(state.submitted){$('finishBox').innerHTML=`<div class="good"><strong>Portafolio entregado</strong> · media por criterios ${avg(p).toFixed(1)}%</div><button id="reportBtn" class="btn secondary" style="margin-top:10px">Descargar informe</button>`;$('reportBtn').onclick=report;return}
    $('finishBox').innerHTML=`<p><strong>Requisitos de entrega:</strong> ${complete?'✓':'○'} 100 actividades · ${cases?'✓':'○'} 7 supuestos evaluables.</p><button id="finishBtn" class="btn" ${complete&&cases?'':'disabled'}>Entregar portafolio</button>`;$('finishBtn').onclick=finish;
  }

  async function finish(){
    if(state.submitted||doneCount()!==100||!casesDone())return;if(!confirm('¿Entregar definitivamente el portafolio de la UD2?'))return;
    const criteria=portfolioScores();
    try{await req('/api/assessment',{method:'POST',body:JSON.stringify({courseId:COURSE_ID,instrument:'portfolio',criteria,ref:'ud2-portfolio-teb-10of10',payload:{microWeightWhenPractical:.4,casesWeightWhenPractical:.6,conceptualUsesMicroOnly:true,activities:100,cases:7,equalCriterionWeight:true}})});state.submitted=true;state.submittedAt=new Date().toISOString();await saveServer();window.parent.postMessage({type:'ud2-portfolio-submitted',criteria},'*');renderAll()}catch(e){alert(e.message)}
  }

  function report(){
    const p=portfolioScores(),m=microScores(),c=caseScoresByCriterion();
    const html=`<!doctype html><meta charset="utf-8"><h1>TEB · UD2 · Informe de portafolio</h1><p>Alumno: ${profile.firstName} ${profile.lastName}</p><p>Entregado: ${state.submittedAt||''}</p><p>Los nueve criterios tienen el mismo peso. Cuando un CE no tiene evidencia de asiento específica, su portafolio se obtiene de las microactividades aplicadas.</p><table border="1" cellpadding="6"><tr><th>Criterio</th><th>Microactividades</th><th>Supuestos</th><th>Portafolio</th></tr>${Object.keys(C.criteria).map(ce=>`<tr><td>${ce}</td><td>${m[ce].toFixed(1)}%</td><td>${c[ce]==null?'N/A':c[ce].toFixed(1)+'%'}</td><td>${p[ce].toFixed(1)}%</td></tr>`).join('')}</table>`;
    const b=new Blob([html],{type:'text/html'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='TEB_UD2_portafolio_informe.html';a.click();URL.revokeObjectURL(a.href);
  }

  function renderAll(){renderQuestion();renderCases();renderProgress()}
  async function init(){
    if(!token){document.body.innerHTML='<div class="wrap"><div class="card bad">Debes iniciar sesión en TEB antes de abrir el portafolio.</div></div>';return}
    profile=(await req('/api/me')).profile;progress=await req('/api/progress?courseId='+encodeURIComponent(COURSE_ID));selected=pick100(profile.code);
    const server=progress.state?.portfolioState||{},local=localState();state={...freshState(),...local,...server};
    if(!state.submitted&&state.bankVersion!==BANK_VERSION)state=freshState();state.bankVersion=BANK_VERSION;
    if(!Array.isArray(state.ids)||state.ids.length!==100)state.ids=selected.map(x=>x.id);
    selected=state.ids.map(id=>C.activityBank.find(x=>x.id===id)).filter(Boolean);
    if(selected.length!==100){selected=pick100(profile.code);state.ids=selected.map(x=>x.id)}
    renderAll();await saveServer();
    if(preparationDone()&&!state.submitted&&doneCount()<100)showSecure('Portafolio preparado','La primera actividad permanece oculta hasta que entres en pantalla completa.');
  }

  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&secureActive&&!safePause)penalizeCurrent('Has abandonado la pantalla completa antes de pulsar «Siguiente».').catch(console.error)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&secureActive&&!safePause)penalizeCurrent('Has abandonado la pantalla activa antes de consolidar la actividad.').catch(console.error)});
  init().catch(e=>{document.body.innerHTML=`<div class="wrap"><div class="card bad">${e.message}</div></div>`});
})();