(()=>{
  const C=window.TEB_UD2;
  if(!C)throw new Error('Carga ud2-course.js antes de ud2-exam-bank.js');
  const distribution={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
  const ops=C.scenarios.flatMap(s=>s.operations);
  const bank=[];let seq=1;
  const id=()=>`UD2-E${String(seq++).padStart(3,'0')}`;
  const add=(criterion,i,prompt,choices,answerIndex=0,type='choice')=>bank.push({id:id(),criterion,difficulty:1+(i%3),type,prompt,choices,answerIndex});
  const opAt=(i,offset=0)=>ops[(i*13+offset*17)%ops.length];
  const accName=code=>`${code} · ${C.accounts[code]}`;

  for(const [criterion,count] of Object.entries(distribution)){
    for(let i=0;i<count;i++){
      const n=i+1;
      if(criterion==='RA2.a'){
        const variants=[
          [`En una empresa que acaba de iniciar un nuevo ejercicio, ¿qué actuación corresponde primero dentro del ciclo contable?`,['Registrar la apertura de las cuentas patrimoniales','Cerrar las cuentas','Calcular las cuentas anuales antes de registrar operaciones'],0],
          [`Tras registrar durante el ejercicio los hechos económicos, ¿qué actuación ayuda a revisar la coherencia de sumas y saldos antes del cierre?`,['El balance de comprobación','Un nuevo asiento de apertura','Eliminar las cuentas con saldo'],0],
          [`¿Qué secuencia representa mejor el ciclo contable simplificado?`,['Apertura → registro → comprobación → resultado/regularización → cierre','Cierre → apertura → cierre → registro','Resultado → apertura → registro → constitución'],0],
          [`Al finalizar el ejercicio, después de determinar el resultado, ¿qué fase permite dejar preparadas las cuentas patrimoniales para enlazar con el ejercicio siguiente?`,['Cierre','Apertura','Registro inicial de facturas'],0]
        ];const v=variants[i%variants.length];add(criterion,i,`Situación ${n}. ${v[0]}`,v[1],v[2],'cycle');continue;
      }
      if(criterion==='RA2.b'){
        const o=opAt(i,2),target=o.entries[i%o.entries.length],wrong=Object.keys(C.accounts).filter(x=>x!==target.account);const w1=wrong[(i*5)%wrong.length],w2=wrong[(i*9+3)%wrong.length];
        add(criterion,i,`Caso ${n}. A partir del hecho «${o.description}», identifica una cuenta que representa correctamente uno de los elementos afectados.`,[accName(target.account),accName(w1),accName(w2)],0,'account');continue;
      }
      if(criterion==='RA2.c'){
        const o=opAt(i,3);const variants=[
          [`Al contabilizar «${o.description}», ¿qué condición formal debe cumplir el asiento?`,['La suma del Debe debe ser igual a la suma del Haber','Todas las cuentas deben ir al Debe','Sólo puede existir una cuenta en el asiento'],0],
          [`¿Qué explica la partida doble en el registro de «${o.description}»?`,['Que el hecho produce efectos relacionados en dos o más cuentas manteniendo el equilibrio','Que el hecho se escribe dos veces en el Diario','Que siempre existen dos pagos'],0],
          [`Si un asiento tiene 950 € en el Debe y 900 € en el Haber, ¿puede considerarse correctamente registrado por partida doble?`,['No, porque falta equilibrio entre Debe y Haber','Sí, si una de las cuentas es de activo','Sí, porque las diferencias inferiores a 100 € son admisibles'],0]
        ];const v=variants[i%variants.length];add(criterion,i,`Caso ${n}. ${v[0]}`,v[1],v[2],'double-entry');continue;
      }
      if(criterion==='RA2.d'){
        const o=opAt(i,4),target=o.entries[i%o.entries.length],correct=target.debit>0?'Debe':'Haber';
        add(criterion,i,`Registro ${n}. En «${o.description}», ¿en qué lado se anota ${accName(target.account)} en el asiento correcto?`,[correct,correct==='Debe'?'Haber':'Debe','No interviene en el asiento'],0,'debit-credit');continue;
      }
      if(criterion==='RA2.e'){
        const variants=[
          ['El balance de comprobación presenta sumas del Debe y Haber diferentes. ¿Qué debes hacer?',['Investigar un error u omisión de registro o traslado','Concluir automáticamente que existe pérdida','Cerrar las cuentas sin revisar nada'],0],
          ['Un balance de comprobación cuadra exactamente. ¿Qué afirmación es correcta?',['Puede seguir existiendo un error conceptual en la elección de cuentas','Garantiza que todos los asientos son correctos','Demuestra que la empresa tiene beneficio'],0],
          ['¿Qué información combina normalmente un balance de comprobación de sumas y saldos?',['Sumas Debe/Haber y saldos deudores/acreedores','Sólo cobros y pagos','Únicamente el resultado del ejercicio'],0],
          ['¿Para qué resulta especialmente útil consultar el balance de comprobación antes del cierre?',['Para localizar incoherencias aritméticas y revisar saldos','Para sustituir todas las facturas','Para determinar por sí solo el IGIC a ingresar'],0]
        ];const v=variants[i%variants.length];add(criterion,i,`Comprobación ${n}. ${v[0]}`,v[1],v[2],'trial-balance');continue;
      }
      if(criterion==='RA2.f'){
        const pairs=[['621','gasto'],['628','gasto'],['629','gasto'],['600','gasto'],['700','ingreso'],['705','ingreso']];const [a,nature]=pairs[i%pairs.length];
        add(criterion,i,`Clasificación ${n}. ¿Qué naturaleza tiene ${accName(a)} dentro de esta unidad?`,[nature,nature==='gasto'?'ingreso':'gasto','activo o pasivo indistintamente'],0,'income-expense');continue;
      }
      if(criterion==='RA2.g'){
        const income=3200+(i%8)*375,expense=1700+(i%7)*260,diff=income-expense;const result=diff>=0?`Beneficio de ${diff.toLocaleString('es-ES')} €`:`Pérdida de ${Math.abs(diff).toLocaleString('es-ES')} €`;
        add(criterion,i,`Resultado ${n}. Los ingresos ascienden a ${income.toLocaleString('es-ES')} € y los gastos a ${expense.toLocaleString('es-ES')} €. ¿Cuál es el resultado básico?`,[result,'Resultado cero',`Pérdida de ${(income+expense).toLocaleString('es-ES')} €`],0,'result');continue;
      }
      if(criterion==='RA2.h'){
        const variants=[
          ['¿Qué hace el asiento de apertura?',['Inicia el ejercicio incorporando los saldos patrimoniales con los que comienza la empresa','Cancela todos los ingresos','Calcula el beneficio sin registrar operaciones'],0],
          ['¿Qué finalidad tiene el asiento de cierre?',['Cerrar las cuentas patrimoniales al terminar el ejercicio','Registrar exclusivamente las ventas pendientes','Crear las cuentas de gastos del ejercicio siguiente'],0],
          ['¿Cómo se relacionan cierre y apertura de ejercicios consecutivos?',['Los saldos patrimoniales de cierre sirven de referencia para la apertura siguiente','No guardan ninguna relación','La apertura elimina los saldos procedentes del cierre'],0]
        ];const v=variants[i%variants.length];add(criterion,i,`Ciclo ${n}. ${v[0]}`,v[1],v[2],'opening-closing');continue;
      }
      if(criterion==='RA2.i'){
        const variants=[
          ['¿Qué cuenta anual muestra principalmente activo, patrimonio neto y pasivo en una fecha?',['Balance de situación','Cuenta de pérdidas y ganancias','Libro Diario'],0],
          ['¿Qué cuenta anual explica la formación del resultado mediante ingresos y gastos?',['Cuenta de pérdidas y ganancias','Balance de situación','Libro Mayor'],0],
          ['¿Qué documento de las cuentas anuales amplía y comenta información que puede no quedar suficientemente explicada en otros estados?',['Memoria','Libro Diario','Balance de comprobación'],0],
          ['¿Cuál de estos documentos es una cuenta anual y no un libro de registro?',['Balance de situación','Libro Diario','Libro Mayor'],0]
        ];const v=variants[i%variants.length];add(criterion,i,`Cuentas anuales ${n}. ${v[0]}`,v[1],v[2],'annual-accounts');continue;
      }
    }
  }
  if(bank.length!==300)throw new Error(`Banco examen incorrecto: ${bank.length}`);
  C.examBank=bank;C.examDistribution=distribution;
})();
