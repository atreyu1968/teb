(()=>{
  const C=window.TEB_UD2;
  if(!C) throw new Error('No se ha cargado TEB_UD2');
  const $=id=>document.getElementById(id);
  const euros=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
  const STORE='teb_ud2_sim_state_v1';
  const emptyState=()=>({completedScenarios:[],scenarioScores:{},currentScenario:1,currentOperation:{},journals:{},attempts:{},hints:{},criterionEvidence:{}});
  let state=loadState();
  let scenario=C.scenarios.find(s=>s.id===state.currentScenario)||C.scenarios[0];
  let opIndex=Math.min(state.currentOperation[scenario.id]||0,scenario.operations.length-1);

  function loadState(){try{return {...emptyState(),...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{return emptyState()}}
  function saveState(){localStorage.setItem(STORE,JSON.stringify(state))}
  function opKey(){return `${scenario.id}:${opIndex}`}
  function isCompleted(id){return state.completedScenarios.includes(id)}
  function isUnlocked(s){if(s.id===1)return true;return isCompleted(s.id-1)}
  function stageLabel(stage){return ({demo:'Demostración',guided:'Práctica guiada',portfolio:'Portafolio',audit:'Auditoría',integrative:'Caso integrador'})[stage]||stage}
  function modeText(){if(scenario.stage==='demo')return 'No evaluable · ayudas completas';if(scenario.stage==='guided')return 'Formativo · ayudas progresivas';return 'Evaluable · 2 intentos'}
  function codeValid(code){return /^\d{3}$/.test(code)||code==='4727'||code==='4777'}
  function moneyNumber(v){const n=Number(String(v||'').replace(',','.'));return Number.isFinite(n)?Math.round(n*100)/100:0}

  function renderScenarioList(){
    const list=$('scenarioList');list.innerHTML='';
    C.scenarios.forEach(s=>{const b=document.createElement('button');b.className=`scenario-item${s.id===scenario.id?' active':''}${isCompleted(s.id)?' done':''}${!isUnlocked(s)?' locked':''}`;b.disabled=!isUnlocked(s);b.innerHTML=`<span class="stage">${stageLabel(s.stage)}</span><strong>${s.id}. ${s.title}</strong><small>${s.operations.length} operaciones${s.evaluated?' · evaluable':' · no evaluable'}</small>`;b.onclick=()=>selectScenario(s.id);list.appendChild(b)})
  }
  function selectScenario(id){const next=C.scenarios.find(s=>s.id===id);if(!next||!isUnlocked(next))return;scenario=next;state.currentScenario=id;opIndex=Math.min(state.currentOperation[id]||0,next.operations.length-1);saveState();renderAll()}
  function renderAccounts(){
    $('accountRule').textContent=C.accountRule;$('bankCount').textContent=C.activityBank.length;
    $('accountList').innerHTML=Object.entries(C.accounts).map(([code,name])=>`<option value="${code}" label="${name}"></option>`).join('');
    $('ledgerAccount').innerHTML='<option value="">Todas las cuentas</option>'+Object.entries(C.accounts).map(([code,name])=>`<option value="${code}">${code} · ${name}</option>`).join('')
  }
  function currentOperation(){return scenario.operations[opIndex]}
  function renderHeader(){
    $('scenarioHeader').innerHTML=`<h2>${scenario.id}. ${scenario.title}</h2><p>${scenario.subtitle} · ${modeText()}</p>`;
    $('modeBadge').textContent=modeText();
    const o=currentOperation();$('operationTitle').textContent=`Operación ${opIndex+1}`;$('operationText').textContent=o.description;$('operationDate').textContent=o.date;$('operationCounter').textContent=`${opIndex+1} / ${scenario.operations.length}`;$('entryTitle').textContent=`Asiento · ${o.date}`;
  }
  function renderReasoning(){
    const o=currentOperation();const box=$('reasoningSteps');
    if(scenario.stage==='demo') box.innerHTML=o.reasoning.map((x,i)=>`<div class="reasoning-step"><strong>Paso ${i+1}</strong><br>${x}</div>`).join('');
    else if(scenario.stage==='guided') box.innerHTML='<div class="reasoning-step"><strong>Procedimiento</strong><br>1. Identifica qué cambia. 2. Decide si aumenta o disminuye. 3. Determina la naturaleza de la cuenta. 4. Aplica Debe/Haber.</div>';
    else box.innerHTML='<div class="reasoning-step"><strong>Trabajo autónomo</strong><br>Analiza la operación antes de introducir el asiento. Las ayudas aparecerán sólo cuando las solicites o cometas un error.</div>';
    renderHint();
  }
  function renderHint(){const o=currentOperation(),n=state.hints[opKey()]||0,box=$('hintBox');if(!n){box.classList.add('hidden');box.textContent='';return}box.classList.remove('hidden');box.innerHTML=`<strong>Pista ${Math.min(n,o.hints.length)}:</strong> ${o.hints[Math.min(n,o.hints.length)-1]}`}
  function askHint(){const o=currentOperation();state.hints[opKey()]=Math.min((state.hints[opKey()]||0)+1,o.hints.length);saveState();renderHint()}

  function makeRow(values={}){const tr=document.createElement('tr');tr.innerHTML=`<td><input class="account-input" list="accountList" inputmode="numeric" maxlength="4" placeholder="Cuenta" value="${values.account||''}"></td><td class="account-desc">${C.accounts[values.account]||'—'}</td><td><input class="money debit" inputmode="decimal" placeholder="0,00" value="${values.debit||''}"></td><td><input class="money credit" inputmode="decimal" placeholder="0,00" value="${values.credit||''}"></td><td><button class="remove-row" title="Eliminar línea">×</button></td>`;
    const account=tr.querySelector('.account-input');account.oninput=()=>{tr.querySelector('.account-desc').textContent=C.accounts[account.value]||'Cuenta no incluida en la UD2';updateTotals()};
    tr.querySelectorAll('.money').forEach(x=>x.oninput=updateTotals);tr.querySelector('.remove-row').onclick=()=>{if($('entryRows').children.length>2)tr.remove();else tr.querySelectorAll('input').forEach(x=>x.value='');updateTotals()};return tr
  }
  function resetEntry(){const body=$('entryRows');body.innerHTML='';body.append(makeRow(),makeRow());updateTotals();$('feedback').className='feedback hidden';$('feedback').innerHTML='';$('nextBtn').classList.add('hidden');$('checkBtn').classList.remove('hidden');$('balanceState').className='balance-state';$('balanceState').textContent='Sin comprobar'}
  function addRow(){if($('entryRows').children.length<6)$('entryRows').append(makeRow())}
  function collectRows(){return [...$('entryRows').querySelectorAll('tr')].map(tr=>({account:tr.querySelector('.account-input').value.trim(),debit:moneyNumber(tr.querySelector('.debit').value),credit:moneyNumber(tr.querySelector('.credit').value)})).filter(r=>r.account||r.debit||r.credit)}
  function updateTotals(){const rows=collectRows(),d=rows.reduce((a,r)=>a+r.debit,0),c=rows.reduce((a,r)=>a+r.credit,0);$('debitTotal').textContent=euros.format(d);$('creditTotal').textContent=euros.format(c);const b=$('balanceState');if(!rows.length){b.className='balance-state';b.textContent='Sin comprobar'}else if(Math.abs(d-c)<.005&&d>0){b.className='balance-state good';b.textContent='Equilibrio matemático ✓'}else{b.className='balance-state bad';b.textContent=`Diferencia ${euros.format(Math.abs(d-c))}`}}
  function normalize(rows){return rows.map(r=>({account:String(r.account),debit:Number(r.debit.toFixed(2)),credit:Number(r.credit.toFixed(2))})).sort((a,b)=>a.account.localeCompare(b.account)||a.debit-b.debit||a.credit-b.credit)}
  function sameEntry(rows,expected){const a=normalize(rows),b=normalize(expected);return a.length===b.length&&a.every((r,i)=>r.account===b[i].account&&Math.abs(r.debit-b[i].debit)<.005&&Math.abs(r.credit-b[i].credit)<.005)}
  function validateRows(rows){if(rows.length<2)return 'Un asiento necesita al menos dos líneas.';for(const r of rows){if(!codeValid(r.account)||!C.accounts[r.account])return `La cuenta ${r.account||'(vacía)'} no pertenece al catálogo de esta unidad.`;if(r.debit>0&&r.credit>0)return `La cuenta ${r.account} no puede tener importe simultáneamente en Debe y Haber en esta operación.`;if(r.debit<=0&&r.credit<=0)return `Introduce el importe de la cuenta ${r.account}.`}const d=rows.reduce((a,r)=>a+r.debit,0),c=rows.reduce((a,r)=>a+r.credit,0);if(Math.abs(d-c)>.005)return 'El asiento no está cuadrado: Debe y Haber deben sumar lo mismo.';return ''}
  function correctionHtml(o){return `<div><strong>Razonamiento correcto</strong><ol>${o.reasoning.map(x=>`<li>${x}</li>`).join('')}</ol><strong>Asiento:</strong><ul>${o.entries.map(r=>`<li>${r.account} · ${C.accounts[r.account]} — ${r.debit?`Debe ${euros.format(r.debit)}`:`Haber ${euros.format(r.credit)}`}</li>`).join('')}</ul></div>`}
  function recordCriterion(criteria,score){criteria.forEach(ce=>{const x=state.criterionEvidence[ce]||{sum:0,count:0};x.sum+=score;x.count+=1;state.criterionEvidence[ce]=x})}
  function acceptOperation(score){const o=currentOperation();state.journals[scenario.id]=state.journals[scenario.id]||[];if(!state.journals[scenario.id].some(x=>x.opId===o.id))state.journals[scenario.id].push({opId:o.id,date:o.date,description:o.description,entries:o.entries,score});if(scenario.evaluated)recordCriterion(o.criteria,score);saveState();renderLedger();renderTrial();renderResult();renderProgress()}
  function checkEntry(){
    const rows=collectRows(),o=currentOperation(),error=validateRows(rows),key=opKey();state.attempts[key]=(state.attempts[key]||0)+1;const attempt=state.attempts[key];
    if(!error&&sameEntry(rows,o.entries)){
      const score=scenario.evaluated?(attempt===1?100:75):100;acceptOperation(score);showFeedback(true,`Asiento correcto. ${scenario.evaluated?`Puntuación de la operación: ${score} %.`: 'Esta práctica no afecta a la calificación.'}`);finishOperation();return
    }
    const reason=error||'El asiento cuadra matemáticamente, pero la lógica contable no es correcta.';
    if(scenario.stage==='demo'||scenario.stage==='guided'){
      state.hints[key]=Math.min((state.hints[key]||0)+1,o.hints.length);saveState();renderHint();showFeedback(false,`${reason} Revisa la pista y vuelve a intentarlo.`);return
    }
    if(attempt<2){state.hints[key]=Math.min((state.hints[key]||0)+1,o.hints.length);saveState();renderHint();showFeedback(false,`${reason} Te queda un segundo intento. Se ha activado una pista de razonamiento.`);return}
    acceptOperation(0);showFeedback(false,`${reason}${correctionHtml(o)}`);finishOperation()
  }
  function showFeedback(good,html){const f=$('feedback');f.className=`feedback ${good?'good':'bad'}`;f.innerHTML=html}
  function finishOperation(){$('checkBtn').classList.add('hidden');$('nextBtn').classList.remove('hidden')}
  function nextOperation(){if(opIndex<scenario.operations.length-1){opIndex++;state.currentOperation[scenario.id]=opIndex;saveState();renderCurrentOperation();return}completeScenario()}
  function completeScenario(){
    const rows=state.journals[scenario.id]||[];const score=rows.length?Math.round(rows.reduce((a,x)=>a+(x.score??100),0)/scenario.operations.length):0;
    if(!isCompleted(scenario.id))state.completedScenarios.push(scenario.id);state.completedScenarios.sort((a,b)=>a-b);state.scenarioScores[scenario.id]=score;saveState();
    const criteria=[...new Set(scenario.operations.flatMap(o=>o.criteria))];
    try{window.parent.postMessage({type:'teb-activity-result',ref:`ud2-case-${scenario.id}`,score,criteria,complete:true,formative:!scenario.evaluated,stage:scenario.stage},'*')}catch{}
    renderScenarioList();showFeedback(true,`Supuesto completado. ${scenario.evaluated?`Resultado: ${score} %.`:'Actividad formativa completada.'} ${scenario.id<14?'Ya puedes continuar con el siguiente supuesto.':'Has completado el gran reto de la UD2.'}`);$('nextBtn').classList.add('hidden')
  }

  function entriesForScenario(){return (state.journals[scenario.id]||[]).flatMap(o=>o.entries.map(e=>({...e,date:o.date,description:o.description,opId:o.opId})))}
  function accountStats(){const map={};entriesForScenario().forEach(e=>{const x=map[e.account]||{account:e.account,debit:0,credit:0,moves:[]};x.debit+=e.debit;x.credit+=e.credit;x.moves.push(e);map[e.account]=x});return map}
  function renderLedger(){const map=accountStats(),filter=$('ledgerAccount').value;const codes=Object.keys(map).sort();if(!codes.length){$('ledgerContent').innerHTML='<div class="empty">Los movimientos aparecerán aquí cuando registres operaciones correctas en el Diario.</div>';return}const selected=filter&&map[filter]?[filter]:codes;$('ledgerContent').innerHTML=selected.map(code=>{let running=0;const rows=map[code].moves.map(m=>{running+=m.debit-m.credit;return `<tr><td>${m.date}</td><td>${m.description}</td><td>${m.debit?euros.format(m.debit):''}</td><td>${m.credit?euros.format(m.credit):''}</td><td>${euros.format(Math.abs(running))} ${running>=0?'D':'H'}</td></tr>`}).join('');return `<h3>${code} · ${C.accounts[code]}</h3><table class="data-table"><thead><tr><th>Fecha</th><th>Concepto</th><th>Debe</th><th>Haber</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody></table>`}).join('')}
  function renderTrial(){const map=accountStats(),codes=Object.keys(map).sort();if(!codes.length){$('trialBalance').innerHTML='<div class="empty">Registra operaciones para construir el balance de comprobación.</div>';return}let td=0,tc=0,sd=0,sc=0;const rows=codes.map(code=>{const x=map[code],bal=x.debit-x.credit,deudor=Math.max(0,bal),acreedor=Math.max(0,-bal);td+=x.debit;tc+=x.credit;sd+=deudor;sc+=acreedor;return `<tr><td>${code}</td><td>${C.accounts[code]}</td><td>${euros.format(x.debit)}</td><td>${euros.format(x.credit)}</td><td>${deudor?euros.format(deudor):''}</td><td>${acreedor?euros.format(acreedor):''}</td></tr>`}).join('');const ok=Math.abs(td-tc)<.005&&Math.abs(sd-sc)<.005;$('trialBalance').innerHTML=`<table class="data-table"><thead><tr><th>Cuenta</th><th>Descripción</th><th>Sumas Debe</th><th>Sumas Haber</th><th>Saldo deudor</th><th>Saldo acreedor</th></tr></thead><tbody>${rows}<tr class="total-row"><td colspan="2">TOTALES</td><td>${euros.format(td)}</td><td>${euros.format(tc)}</td><td>${euros.format(sd)}</td><td>${euros.format(sc)}</td></tr></tbody></table><div class="balance-banner ${ok?'good':'bad'}">${ok?'✓ El balance de comprobación está cuadrado.':'⚠ Existe una diferencia que debe investigarse.'}</div>`}
  function renderResult(){const entries=entriesForScenario();let expenses=0,income=0;entries.forEach(e=>{if(e.account.startsWith('6'))expenses+=e.debit-e.credit;if(e.account.startsWith('7'))income+=e.credit-e.debit});const result=income-expenses;$('resultContent').innerHTML=`<p>Ingresos acumulados: <strong>${euros.format(income)}</strong></p><p>Gastos acumulados: <strong>${euros.format(expenses)}</strong></p><div class="result-big ${result>=0?'profit':'loss'}">${result>=0?'Beneficio':'Pérdida'}: ${euros.format(Math.abs(result))}</div><p class="muted">El resultado se calcula aquí con finalidad didáctica a partir de las cuentas de los grupos 6 y 7 registradas en este supuesto.</p>`}
  function renderProgress(){const ev=state.criterionEvidence;$('criteriaProgress').innerHTML=Object.entries(C.criteria).map(([ce,c])=>{const x=ev[ce],score=x?Math.round(x.sum/x.count):0;return `<div class="criterion-card"><strong><span>${ce}</span><span>${score}%</span></strong><div>${c.label}</div><div class="criterion-bar"><span style="width:${score}%"></span></div><small>${x?.count||0} evidencias evaluables · peso RA2 ${(c.weight*100).toLocaleString('es-ES')} %</small></div>`}).join('')}
  function renderCurrentOperation(){renderHeader();renderReasoning();resetEntry();renderLedger();renderTrial();renderResult();renderProgress()}
  function renderAll(){renderScenarioList();renderCurrentOperation()}

  document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active-view'));tab.classList.add('active');$(tab.dataset.view+'View').classList.add('active-view');if(tab.dataset.view==='ledger')renderLedger();if(tab.dataset.view==='trial')renderTrial();if(tab.dataset.view==='result')renderResult();if(tab.dataset.view==='progress')renderProgress()});
  $('addRowBtn').onclick=addRow;$('checkBtn').onclick=checkEntry;$('nextBtn').onclick=nextOperation;$('hintBtn').onclick=askHint;$('ledgerAccount').onchange=renderLedger;
  renderAccounts();renderAll();
})();
