(()=>{
  const COURSE_ID='teb-ud2-ra2';
  const STORE='teb_ud2_sim_state_v1';
  const $=id=>document.getElementById(id);
  let token=localStorage.getItem('teb_student_token')||'';
  let profile=null,progress=null,lastTick=Date.now(),timer=null,saving=false;
  async function req(path,opt={}){const headers={'Content-Type':'application/json',...(opt.headers||{})};if(token)headers.Authorization='Bearer '+token;const r=await fetch(path,{...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Error de comunicación');return d}
  function msg(text,bad=false){$('loginMsg').textContent=text;$('loginMsg').className='notice '+(bad?'error':'')}
  function simState(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return{}}}
  function metrics(s){const done=(s.completedScenarios||[]).length;const evaluated=Object.entries(s.scenarioScores||{}).filter(([id])=>Number(id)>=8).map(([,v])=>Number(v)||0);const score=evaluated.length?evaluated.reduce((a,b)=>a+b,0)/evaluated.length:0;return{completion:Math.round(done/14*100),score:Math.round(score*100)/100,currentSession:Math.max(1,Math.min(14,Number(s.currentScenario)||1)),status:done>=14?'completed':done?'incomplete':'not-started'}}
  async function load(){if(!token){$('loginBox').classList.remove('hidden');return}try{const me=await req('/api/me');profile=me.profile;progress=await req('/api/progress?courseId='+encodeURIComponent(COURSE_ID));if(progress.state?.simulatorState)localStorage.setItem(STORE,JSON.stringify(progress.state.simulatorState));$('studentName').textContent=`${profile.firstName} ${profile.lastName} · ${profile.code}`;$('loginBox').classList.add('hidden');$('hostApp').classList.remove('hidden');$('ud2Frame').src='ud2-simulator.html';updateHeader();lastTick=Date.now();clearInterval(timer);timer=setInterval(sync,15000)}catch(e){localStorage.removeItem('teb_student_token');token='';$('loginBox').classList.remove('hidden');msg(e.message,true)}}
  async function sync(){if(!token||saving)return;saving=true;try{const now=Date.now(),elapsed=Math.max(0,(now-lastTick)/1000);lastTick=now;const s=simState(),m=metrics(s);progress=progress||{state:{},timeSeconds:0};progress.timeSeconds=(Number(progress.timeSeconds)||0)+elapsed;progress.state={...(progress.state||{}),simulatorState:s};$('saveState').textContent='Guardando…';await req('/api/progress',{method:'PUT',body:JSON.stringify({courseId:COURSE_ID,version:'0.1.0',state:progress.state,score:m.score,completion:m.completion,timeSeconds:Math.round(progress.timeSeconds),currentSession:m.currentSession,status:m.status})});$('saveState').textContent='Guardado';$('progressText').textContent=`${m.completion} %`;}catch(e){$('saveState').textContent='Sin guardar';console.error(e)}finally{saving=false}}
  function updateHeader(){const m=metrics(simState());$('progressText').textContent=`${m.completion} %`}
  async function recordScenario(d){try{for(const ce of d.criteria||[])await req('/api/events',{method:'POST',body:JSON.stringify({courseId:COURSE_ID,eventType:d.formative?'ud2-formative-case':'ud2-evaluable-case',ref:d.ref,criterion:ce,score:d.score,payload:{stage:d.stage,formative:!!d.formative}})});await sync()}catch(e){console.error(e)}}
  window.addEventListener('message',e=>{const d=e.data;if(!d)return;if(d.type==='teb-activity-result')recordScenario(d)});
  $('loginBtn').onclick=async()=>{try{const d=await req('/api/login',{method:'POST',body:JSON.stringify({role:'student',code:$('studentCode').value,pin:$('studentPin').value})});token=d.token;profile=d.profile;localStorage.setItem('teb_student_token',token);await load()}catch(e){msg(e.message,true)}};
  $('logoutBtn').onclick=async()=>{await sync();localStorage.removeItem('teb_student_token');location.reload()};
  window.addEventListener('beforeunload',()=>{try{sync()}catch{}});
  load();
})();
