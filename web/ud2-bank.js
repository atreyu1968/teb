(()=>{
  const C=window.TEB_UD2;
  if(!C)throw new Error('Carga ud2-course.js antes de ud2-bank.js');
  const distribution={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
  const operations=C.scenarios.flatMap(s=>s.operations);
  const bank=[];
  let seq=1;
  const id=()=>`UD2-A${String(seq++).padStart(3,'0')}`;
  const pick=i=>operations[i%operations.length];
  const item=(criterion,i,data)=>({id:id(),criterion,difficulty:1+(i%3),...data});

  const conceptual={
    'RA2.a':[
      ['Ordena las fases básicas del ciclo contable.',['Apertura → registro → comprobación → regularización/resultado → cierre','Cierre → apertura → registro → resultado','Registro → cierre → apertura → comprobación'],0,'sequence-cycle'],
      ['¿En qué fase se registran de forma sistemática los hechos económicos del ejercicio?',['Registro','Cierre','Apertura'],0,'identify-phase'],
      ['¿Qué fase permite revisar sumas, saldos y posibles incidencias antes del cierre?',['Comprobación','Apertura','Constitución'],0,'identify-phase']
    ],
    'RA2.e':[
      ['¿Para qué sirve principalmente el balance de comprobación?',['Comprobar sumas y saldos y ayudar a detectar errores u omisiones','Calcular por sí solo todos los impuestos','Sustituir al Libro Diario'],0,'trial-balance'],
      ['Si las sumas del Debe y del Haber no coinciden en el balance de comprobación, ¿qué indica?',['Existe al menos una incidencia de registro o traslado que debe revisarse','La empresa ha obtenido una pérdida','El asiento de apertura es correcto'],0,'spot-error'],
      ['Un balance de comprobación cuadrado…',['no garantiza que todas las cuentas elegidas sean conceptualmente correctas','garantiza que no existe ningún error contable posible','sustituye a las cuentas anuales'],0,'reasoning']
    ],
    'RA2.g':[
      ['Si los ingresos son 8.000 € y los gastos 6.500 €, el resultado es…',['Beneficio de 1.500 €','Pérdida de 1.500 €','Beneficio de 14.500 €'],0,'result'],
      ['El resultado contable básico se obtiene comparando…',['ingresos y gastos del periodo','cobros y pagos exclusivamente','activo y pasivo sin considerar ingresos ni gastos'],0,'result'],
      ['Si los gastos superan a los ingresos…',['existe una pérdida','existe siempre un cobro pendiente','el balance de comprobación no puede cuadrar'],0,'result']
    ],
    'RA2.h':[
      ['¿Qué función cumple el asiento de apertura?',['Iniciar el ejercicio trasladando los saldos patrimoniales de cierre del ejercicio anterior','Calcular el resultado del ejercicio','Registrar únicamente cobros y pagos'],0,'opening-closing'],
      ['¿Qué función cumple el asiento de cierre?',['Cerrar las cuentas patrimoniales al finalizar el ejercicio','Abrir las cuentas de ingresos','Sustituir al balance de comprobación'],0,'opening-closing'],
      ['Apertura y cierre se relacionan porque…',['los saldos patrimoniales de cierre sirven de base para la apertura siguiente','ambos registran exclusivamente gastos','ambos eliminan el patrimonio neto'],0,'opening-closing']
    ],
    'RA2.i':[
      ['¿Qué estado informa principalmente de la situación patrimonial de la empresa en una fecha?',['Balance de situación','Cuenta de pérdidas y ganancias','Libro Diario'],0,'annual-accounts'],
      ['¿Qué estado informa principalmente de los ingresos, gastos y resultado del periodo?',['Cuenta de pérdidas y ganancias','Balance de situación','Libro Mayor'],0,'annual-accounts'],
      ['¿Qué documento complementa y amplía la información contenida en las demás cuentas anuales?',['Memoria','Libro Diario','Balance de comprobación'],0,'annual-accounts']
    ]
  };

  function operationQuestion(criterion,i){
    const o=pick(i*7+criterion.charCodeAt(4));
    const first=o.entries[0],second=o.entries[1];
    if(criterion==='RA2.b')return item(criterion,i,{type:'identify-account',prompt:`En la operación «${o.description}», ¿qué cuenta representa uno de los elementos afectados?`,choices:[`${first.account} · ${C.accounts[first.account]}`,`${second.account} · ${C.accounts[second.account]}`,'Ninguna cuenta interviene'],answerIndex:i%2===0?0:1,operationId:o.id});
    if(criterion==='RA2.c')return item(criterion,i,{type:'double-entry',prompt:`Analiza «${o.description}». ¿Qué principio debe mantenerse al registrar el asiento?`,choices:['La suma del Debe debe coincidir con la suma del Haber','Sólo puede intervenir una cuenta','Todo asiento debe implicar un cobro'],answerIndex:0,operationId:o.id});
    if(criterion==='RA2.d'){
      const target=i%2===0?first:second;const correct=target.debit>0?'Debe':'Haber';return item(criterion,i,{type:'debit-credit',prompt:`En «${o.description}», la cuenta ${target.account} · ${C.accounts[target.account]} se registra en…`,choices:[correct,correct==='Debe'?'Haber':'Debe','No se registra'],answerIndex:0,operationId:o.id});
    }
    if(criterion==='RA2.f'){
      const expense=o.entries.find(e=>e.account.startsWith('6')),income=o.entries.find(e=>e.account.startsWith('7'));const target=expense||income;if(!target)return item(criterion,i,{type:'income-expense',prompt:'¿Cuál de estas cuentas pertenece a ingresos o gastos?',choices:['621 · Arrendamientos y cánones','572 · Bancos','430 · Clientes'],answerIndex:0});const nature=target.account.startsWith('6')?'gasto':'ingreso';return item(criterion,i,{type:'income-expense',prompt:`En «${o.description}», ${target.account} · ${C.accounts[target.account]} es una cuenta de…`,choices:[nature,nature==='gasto'?'ingreso':'gasto','activo'],answerIndex:0,operationId:o.id});
    }
  }

  for(const [criterion,count] of Object.entries(distribution)){
    for(let i=0;i<count;i++){
      if(['RA2.b','RA2.c','RA2.d','RA2.f'].includes(criterion)){bank.push(operationQuestion(criterion,i));continue}
      const tpl=conceptual[criterion][i%conceptual[criterion].length];
      let prompt=tpl[0],choices=[...tpl[1]],answerIndex=tpl[2];
      if(criterion==='RA2.g'&&i%3===0){const income=2500+(i%8)*250,expenses=1400+(i%6)*200,diff=income-expenses;prompt=`Una empresa presenta ingresos por ${income.toLocaleString('es-ES')} € y gastos por ${expenses.toLocaleString('es-ES')} €. ¿Cuál es su resultado?`;choices=[`${diff>=0?'Beneficio':'Pérdida'} de ${Math.abs(diff).toLocaleString('es-ES')} €`,`Resultado cero`,`Pérdida de ${(income+expenses).toLocaleString('es-ES')} €`];answerIndex=0}
      bank.push(item(criterion,i,{type:tpl[3],prompt,choices,answerIndex}));
    }
  }
  C.activityBank=bank;
  C.activityDistribution=distribution;
})();
