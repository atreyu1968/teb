(()=>{
  const C=window.TEB_UD2;
  if(!C)throw new Error('Carga ud2-course.js antes de ud2-bank.js');

  const distribution={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
  const operations=C.scenarios.flatMap(s=>s.operations);
  const bank=[]; let seq=1;
  const id=()=>`UD2-A${String(seq++).padStart(3,'0')}`;
  const opAt=(i,offset=0)=>operations[(i*11+offset*17)%operations.length];
  const accountLabel=code=>`${code} · ${C.accounts[code]}`;
  const accountClue={
    '100':'la aportación estable de los socios',
    '216':'el mobiliario de oficina',
    '217':'los equipos informáticos de la empresa',
    '400':'la deuda con proveedores de mercaderías',
    '410':'la deuda con acreedores por servicios recibidos',
    '430':'el derecho de cobro frente a clientes',
    '523':'la deuda con el proveedor de inmovilizado',
    '570':'el efectivo disponible en caja',
    '572':'el dinero disponible en la cuenta bancaria',
    '600':'las compras de mercaderías del periodo',
    '621':'el gasto por alquiler del local',
    '628':'el gasto por suministros',
    '629':'otros servicios consumidos',
    '700':'los ingresos por ventas de mercaderías',
    '705':'los ingresos por servicios prestados',
    '4727':'el IGIC soportado deducible',
    '4777':'el IGIC repercutido a clientes'
  };

  function rotate(choices,answerIndex,seed){
    const n=choices.length,shift=seed%n;
    const rotated=choices.map((_,j)=>choices[(j+shift)%n]);
    return {choices:rotated,answerIndex:(answerIndex-shift+n)%n};
  }
  const fifthDistractor={
    'RA2.a':'La fase depende únicamente del saldo bancario',
    'RA2.b':'999 · Cuenta inexistente en esta unidad',
    'RA2.c':'Debe y Haber pueden diferir si existe justificante',
    'RA2.d':'El lado depende de si la empresa obtiene beneficio',
    'RA2.e':'El balance de comprobación sustituye a todos los libros',
    'RA2.f':'patrimonio neto',
    'RA2.g':'No puede calcularse comparando ingresos y gastos',
    'RA2.h':'Apertura y cierre no guardan relación entre ejercicios',
    'RA2.i':'Extracto bancario'
  };
  function add(criterion,i,type,prompt,choices,answerIndex=0,extra={}){
    const base=[...choices];
    if(base.length===4){let extraChoice=fifthDistractor[criterion]||'Ninguna regla contable permite decidirlo';if(base.includes(extraChoice))extraChoice='Ninguna de las opciones anteriores';base.push(extraChoice)}
    const mixed=rotate(base,answerIndex,i+criterion.charCodeAt(4));
    bank.push({id:id(),criterion,difficulty:1+(i%3),type,prompt:`[${criterion} · ${i+1}] ${prompt}`,choices:mixed.choices,answerIndex:mixed.answerIndex,...extra});
  }
  function distractAccounts(correct,i){
    const codes=Object.keys(C.accounts).filter(x=>x!==correct);
    const picked=[];
    for(let k=0;k<codes.length&&picked.length<4;k++){
      const c=codes[(i*5+k*7)%codes.length];
      if(c!==correct&&!picked.includes(c))picked.push(c);
    }
    return picked;
  }

  for(const [criterion,count] of Object.entries(distribution)){
    for(let i=0;i<count;i++){
      const n=i+1;

      if(criterion==='RA2.a'){
        const variants=[
          ['Una empresa inicia un nuevo ejercicio. ¿Qué fase debe realizar antes de registrar las operaciones del periodo?',['Apertura','Cierre','Regularización','Formulación de cuentas anuales'],0,'sequence-cycle'],
          ['Después de registrar durante el ejercicio los hechos económicos, ¿qué fase ayuda a revisar sumas y saldos antes del cierre?',['Comprobación','Apertura','Constitución','Reparto del resultado'],0,'identify-phase'],
          ['¿Qué secuencia resume mejor el ciclo contable básico?',['Apertura → registro → comprobación → regularización/resultado → cierre','Cierre → apertura → cierre → registro → resultado','Resultado → cierre → apertura → registro → constitución','Registro → apertura → cuentas anuales → cierre → comprobación'],0,'sequence-cycle'],
          ['¿En qué fase se anotan sistemáticamente facturas, cobros, pagos y demás hechos del ejercicio?',['Registro','Cierre','Apertura','Formulación inicial'],0,'identify-phase'],
          ['¿Qué fase deja las cuentas patrimoniales preparadas para enlazar con el ejercicio siguiente?',['Cierre','Registro diario','Comprobación inicial','Conciliación de caja'],0,'identify-phase'],
          ['Antes de cerrar, la empresa revisa si las sumas y saldos son coherentes. ¿Qué instrumento/fase está utilizando?',['Comprobación','Apertura','Inventario comercial','Constitución'],0,'identify-phase']
        ];
        const v=variants[i%variants.length];add(criterion,i,v[3],`Situación ${n}: ${v[0]}`,v[1],v[2]);continue;
      }

      if(criterion==='RA2.b'){
        const o=opAt(i,2),target=o.entries[(i*3)%o.entries.length];
        const wrong=distractAccounts(target.account,i).map(accountLabel);
        add(criterion,i,'identify-account',`En la operación «${o.description}», ¿qué cuenta representa específicamente ${accountClue[target.account]}?`,[accountLabel(target.account),...wrong],0,{operationId:o.id});continue;
      }

      if(criterion==='RA2.c'){
        const o=opAt(i,3),amount=250+(i%12)*75;
        const variants=[
          [`Al registrar «${o.description}», ¿qué condición debe cumplir el asiento por partida doble?`,['La suma del Debe debe coincidir con la suma del Haber','Todas las cuentas deben ir al Debe','Sólo puede intervenir una cuenta','Debe existir siempre movimiento de banco'],0,'double-entry'],
          [`Un asiento presenta ${amount} € en el Debe y ${amount} € en el Haber. ¿Qué puedes afirmar con seguridad?`,['Está cuadrado aritméticamente, aunque todavía podría existir un error conceptual','Es necesariamente correcto en todos sus aspectos','Demuestra que hubo un cobro','Demuestra que todas las cuentas son de activo'],0,'double-entry'],
          [`Un hecho económico afecta a dos cuentas y una aumenta mientras otra disminuye. ¿Qué principio explica que ambos efectos deban registrarse coordinadamente?`,['Partida doble','Devengo de caja','Cierre automático','Inventario permanente obligatorio'],0,'double-entry'],
          [`Si el Debe suma ${amount+50} € y el Haber ${amount} €, ¿puede darse por válido el asiento?`,['No, falta equilibrio entre Debe y Haber','Sí, si la diferencia es inferior al 20 %','Sí, si interviene una cuenta de gasto','Sí, siempre que exista justificante'],0,'double-entry'],
          [`¿Por qué «${o.description}» no debe registrarse atendiendo sólo a una de las cuentas afectadas?`,['Porque la partida doble exige representar todos los efectos del hecho manteniendo el equilibrio','Porque todos los asientos deben tener cuatro cuentas','Porque el Libro Mayor sustituye al Diario','Porque cada operación debe repetirse dos veces'],0,'double-entry']
        ];
        const v=variants[i%variants.length];add(criterion,i,v[3],`Caso ${n}. ${v[0]}`,v[1],v[2],{operationId:o.id});continue;
      }

      if(criterion==='RA2.d'){
        const o=opAt(i,4),target=o.entries[i%o.entries.length],correct=target.debit>0?'Debe':'Haber';
        add(criterion,i,'debit-credit',`En «${o.description}», ¿en qué lado debe registrarse ${accountLabel(target.account)} por el efecto descrito?`,[correct,correct==='Debe'?'Haber':'Debe','En ambos lados por el mismo importe','No interviene en el asiento'],0,{operationId:o.id});continue;
      }

      if(criterion==='RA2.e'){
        const base=1800+(i%10)*125,delta=(i%4===0)?50:0;
        const variants=[
          [`El balance de comprobación muestra Debe ${base.toLocaleString('es-ES')} € y Haber ${(base-delta).toLocaleString('es-ES')} €. ¿Qué actuación es correcta?`,delta?['Investigar una incidencia de registro o traslado antes de continuar','Cerrar el ejercicio porque la diferencia es pequeña','Modificar el resultado para compensar','Ignorar la diferencia si existe factura']:['Reconocer que cuadra aritméticamente, pero seguir revisando la corrección conceptual','Dar por demostrado que todas las cuentas elegidas son correctas','Concluir que existe beneficio','Eliminar las cuentas sin saldo'],0,'trial-balance'],
          ['Un balance de comprobación cuadra exactamente. ¿Qué afirmación es correcta?',['Puede seguir existiendo un error conceptual en la elección de cuentas','Garantiza que todos los asientos son correctos','Demuestra que la empresa tiene beneficio','Sustituye al Libro Diario'],0,'reasoning'],
          ['¿Qué combina normalmente un balance de comprobación de sumas y saldos?',['Sumas Debe/Haber y saldos deudores/acreedores','Sólo cobros y pagos','Únicamente ingresos y gastos','Sólo las cuentas con saldo cero'],0,'trial-balance'],
          ['¿Para qué es especialmente útil antes del cierre?',['Para localizar incoherencias aritméticas y revisar saldos','Para sustituir todos los justificantes','Para calcular por sí solo el impuesto','Para eliminar automáticamente errores conceptuales'],0,'trial-balance']
        ];
        const v=variants[i%variants.length];add(criterion,i,v[3],`Comprobación ${n}. ${v[0]}`,v[1],v[2]);continue;
      }

      if(criterion==='RA2.f'){
        const pairs=[['621','gasto'],['628','gasto'],['629','gasto'],['600','gasto'],['700','ingreso'],['705','ingreso']];
        const [code,nature]=pairs[i%pairs.length];
        const opposite=nature==='gasto'?'ingreso':'gasto';
        add(criterion,i,'income-expense',`Clasifica ${accountLabel(code)} dentro de la lógica de esta unidad.`,[nature,opposite,'activo','pasivo'],0);continue;
      }

      if(criterion==='RA2.g'){
        const income=3200+(i%9)*375,expense=1700+(i%8)*260,diff=income-expense;
        const correct=`${diff>=0?'Beneficio':'Pérdida'} de ${Math.abs(diff).toLocaleString('es-ES')} €`;
        add(criterion,i,'result',`Una empresa acumula ingresos por ${income.toLocaleString('es-ES')} € y gastos por ${expense.toLocaleString('es-ES')} €. ¿Cuál es el resultado contable básico?`,[correct,'Resultado cero',`Pérdida de ${(income+expense).toLocaleString('es-ES')} €`,`Beneficio de ${expense.toLocaleString('es-ES')} €`],0);continue;
      }

      if(criterion==='RA2.h'){
        const variants=[
          ['¿Qué hace el asiento de apertura?',['Inicia el ejercicio incorporando los saldos patrimoniales con los que comienza la empresa','Cancela todos los ingresos','Calcula el beneficio sin registrar operaciones','Sustituye al Libro Mayor'],0],
          ['¿Qué finalidad tiene el asiento de cierre?',['Cerrar las cuentas patrimoniales al terminar el ejercicio','Registrar exclusivamente ventas pendientes','Crear las cuentas de gastos del siguiente ejercicio','Eliminar los justificantes'],0],
          ['¿Cómo se relacionan cierre y apertura de ejercicios consecutivos?',['Los saldos patrimoniales de cierre sirven de referencia para la apertura siguiente','No guardan ninguna relación','La apertura elimina los saldos del cierre','Ambos contienen sólo ingresos y gastos'],0],
          ['¿Cuál se realiza primero al comenzar un ejercicio ya iniciado por una empresa existente?',['Apertura','Cierre','Regularización final','Cuenta de pérdidas y ganancias'],0],
          ['¿Qué idea describe mejor el cierre?',['Finaliza formalmente el registro del ejercicio y deja cerradas las cuentas patrimoniales','Borra la historia contable','Convierte todos los activos en gastos','Impide elaborar las cuentas anuales'],0]
        ];const v=variants[i%variants.length];add(criterion,i,'opening-closing',`Ciclo ${n}. ${v[0]}`,v[1],v[2]);continue;
      }

      if(criterion==='RA2.i'){
        const variants=[
          ['¿Qué cuenta anual muestra principalmente activo, patrimonio neto y pasivo en una fecha?',['Balance de situación','Cuenta de pérdidas y ganancias','Libro Diario','Libro Mayor'],0],
          ['¿Qué cuenta anual explica la formación del resultado mediante ingresos y gastos?',['Cuenta de pérdidas y ganancias','Balance de situación','Libro Mayor','Balance de comprobación'],0],
          ['¿Qué documento de las cuentas anuales amplía y comenta información que puede no quedar suficientemente explicada en otros estados?',['Memoria','Libro Diario','Libro Mayor','Ficha de proveedores'],0],
          ['¿Cuál es una cuenta anual y no un libro de registro?',['Balance de situación','Libro Diario','Libro Mayor','Libro auxiliar de caja'],0],
          ['Si quieres conocer la situación patrimonial al cierre, ¿qué documento consultarías primero?',['Balance de situación','Libro Diario','Cuenta bancaria','Factura de compra'],0],
          ['Si quieres conocer el beneficio o pérdida del periodo y su formación, ¿qué estado es el más directo?',['Cuenta de pérdidas y ganancias','Balance de situación','Mayor de Bancos','Asiento de apertura'],0]
        ];const v=variants[i%variants.length];add(criterion,i,'annual-accounts',`Cuentas anuales ${n}. ${v[0]}`,v[1],v[2]);continue;
      }
    }
  }

  if(bank.length!==300)throw new Error(`Banco de portafolio incorrecto: ${bank.length}`);
  if(new Set(bank.map(x=>x.prompt)).size!==300)throw new Error('El banco de portafolio contiene enunciados duplicados');
  C.activityBank=bank;
  C.activityDistribution=distribution;
})();