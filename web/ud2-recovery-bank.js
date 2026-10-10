(()=>{
  const C=window.TEB_UD2;
  if(!C)throw new Error('Carga ud2-course.js antes de ud2-recovery-bank.js');
  const distribution={'RA2.a':24,'RA2.b':30,'RA2.c':42,'RA2.d':48,'RA2.e':36,'RA2.f':27,'RA2.g':24,'RA2.h':27,'RA2.i':42};
  const ops=C.scenarios.flatMap(s=>s.operations),bank=[];let seq=1;
  const id=()=>`UD2-R${String(seq++).padStart(3,'0')}`;
  const acc=code=>`${code} · ${C.accounts[code]}`;
  const opAt=(i,k=0)=>ops[(i*17+k*23)%ops.length];
  const add=(criterion,i,prompt,choices,answerIndex,hint,explanation,kind='reinforcement')=>{const n=choices.length,shift=(i+criterion.charCodeAt(4))%n,rotated=choices.map((_,j)=>choices[(j+shift)%n]),correct=(answerIndex-shift+n)%n;bank.push({id:id(),criterion,difficulty:1+(i%3),type:'choice',kind,prompt,choices:rotated,answerIndex:correct,hint,explanation})};
  for(const [ce,count] of Object.entries(distribution)){
    for(let i=0;i<count;i++){
      const n=i+1,practical=['RA2.c','RA2.d','RA2.e','RA2.f','RA2.g'].includes(ce)&&i%3===0;
      if(ce==='RA2.a'){
        const v=[
          ['Una empresa inicia el ejercicio con saldos procedentes del cierre anterior. ¿Qué fase debe registrar primero?',['Apertura','Cierre','Regularización'],0],
          ['Después de varios asientos del mes, la empresa quiere revisar que las sumas y saldos son coherentes. ¿Qué fase realiza?',['Comprobación','Apertura','Constitución'],0],
          ['Una vez determinado el resultado y antes de comenzar el siguiente ejercicio, ¿qué fase termina el ciclo?',['Cierre','Registro ordinario','Apertura'],0],
          ['¿Qué orden ayuda mejor a reconstruir un ejercicio?',['Apertura → operaciones → comprobación → resultado → cierre','Resultado → cierre → apertura → operaciones','Cierre → resultado → apertura → cierre'],0]
        ][i%4];add(ce,i,`Recuperación ${n}. ${v[0]}`,v[1],v[2],'Sitúa la situación en el comienzo, desarrollo o final del ejercicio.',`La idea clave es: ${v[1][v[2]]}.`);continue;
      }
      if(ce==='RA2.b'){
        const o=opAt(i,1),e=o.entries[(i+1)%o.entries.length];
        const clue={
          '100':'la aportación estable de los socios','216':'el mobiliario de oficina','217':'los equipos informáticos',
          '400':'la deuda con proveedores de mercaderías','410':'la deuda con acreedores por servicios',
          '430':'el derecho de cobro frente a clientes','523':'la deuda con el proveedor de inmovilizado',
          '570':'el efectivo en caja','572':'el dinero en la cuenta bancaria','600':'las compras de mercaderías',
          '621':'el gasto por alquiler','628':'el gasto por suministros','629':'otros servicios consumidos',
          '700':'los ingresos por ventas','705':'los ingresos por servicios','4727':'el IGIC soportado','4777':'el IGIC repercutido'
        }[e.account];
        const pool=Object.keys(C.accounts).filter(x=>x!==e.account&&!o.entries.some(z=>z.account===x)),w1=pool[(i*7)%pool.length],w2=pool[(i*11+2)%pool.length];
        add(ce,i,`Recuperación ${n}. En «${o.description}», ¿qué cuenta representa específicamente ${clue}?`,[acc(e.account),acc(w1),acc(w2)],0,'Describe primero el elemento sin usar todavía Debe/Haber.','Identifica la cuenta que representa exactamente el elemento descrito.');continue;
      }
      if(ce==='RA2.c'){
        const o=opAt(i,2);if(practical){const d=o.entries.reduce((a,x)=>a+x.debit,0);add(ce,i,`Caso práctico ${n}. Se propone registrar «${o.description}». ¿Qué comprobación confirma que el asiento respeta la partida doble?`,[`Debe y Haber suman ${d.toLocaleString('es-ES')} €`,`Todas las líneas están en el Debe`,`Sólo aparece una cuenta`],0,'Suma por separado Debe y Haber.','La partida doble exige igualdad entre los importes totales anotados en Debe y Haber.','practical')}else add(ce,i,`Recuperación ${n}. ¿Qué idea explica mejor la partida doble?`,['Cada hecho tiene efectos relacionados en dos o más cuentas y mantiene el equilibrio','Cada factura se registra dos veces','Todo hecho produce siempre un cobro y un pago'],0,'Piensa en el doble efecto económico, no en duplicar registros.','La partida doble refleja efectos relacionados y mantiene Debe = Haber.');continue;
      }
      if(ce==='RA2.d'){
        const o=opAt(i,3),e=o.entries[i%o.entries.length],side=e.debit>0?'Debe':'Haber';
        add(ce,i,`${practical?'Caso práctico':'Recuperación'} ${n}. En «${o.description}», la cuenta ${acc(e.account)} debe anotarse en…`,[side,side==='Debe'?'Haber':'Debe','No interviene'],0,'Decide primero si el elemento aumenta o disminuye; después aplica su naturaleza.',`${acc(e.account)} se anota en el ${side} en este asiento.`,practical?'practical':'reinforcement');continue;
      }
      if(ce==='RA2.e'){
        if(practical){const a=1500+(i%6)*125,b=a-(50+(i%4)*25);add(ce,i,`Caso práctico ${n}. En un balance de comprobación, las sumas Debe son ${a.toLocaleString('es-ES')} € y las sumas Haber ${b.toLocaleString('es-ES')} €. ¿Qué procede?`,['Investigar un error u omisión antes de continuar','Dar el balance por válido','Concluir que la diferencia es el beneficio'],0,'Compara los totales; deben coincidir.','Si las sumas no coinciden existe una incidencia de registro o traslado que debe investigarse.','practical')}else{const v=[['Un balance cuadra. ¿Qué NO demuestra por sí solo?',['Que las cuentas elegidas sean conceptualmente correctas','Que las sumas Debe y Haber coinciden','Que los saldos pueden revisarse'],0],['¿Qué permite detectar especialmente un balance de comprobación?',['Descuadres de sumas y saldos','Todas las facturas falsas','El beneficio sin usar ingresos ni gastos'],0]][i%2];add(ce,i,`Recuperación ${n}. ${v[0]}`,v[1],v[2],'Distingue control aritmético de corrección conceptual.',`La opción correcta es ${v[1][v[2]]}.`)}continue;
      }
      if(ce==='RA2.f'){
        const list=[['600','gasto'],['621','gasto'],['628','gasto'],['629','gasto'],['700','ingreso'],['705','ingreso']], [code,nature]=list[i%list.length];
        if(practical)add(ce,i,`Caso práctico ${n}. En una operación aparece ${acc(code)}. Para determinar el resultado, esta cuenta se trata como…`,[nature,nature==='gasto'?'ingreso':'gasto','activo corriente'],0,'Relaciona grupo 6 con gastos y grupo 7 con ingresos.',`${acc(code)} es una cuenta de ${nature}.`,'practical');else add(ce,i,`Recuperación ${n}. ¿Cómo se clasifica ${acc(code)}?`,[nature,nature==='gasto'?'ingreso':'gasto','pasivo'],0,'Fíjate en el grupo de la cuenta.',`${acc(code)} pertenece al grupo utilizado para ${nature}s en esta unidad.`);continue;
      }
      if(ce==='RA2.g'){
        const inc=2500+(i%9)*320,exp=1400+(i%7)*210,d=inc-exp,right=d>=0?`Beneficio de ${d.toLocaleString('es-ES')} €`:`Pérdida de ${Math.abs(d).toLocaleString('es-ES')} €`;
        add(ce,i,`${practical?'Caso práctico':'Recuperación'} ${n}. Ingresos: ${inc.toLocaleString('es-ES')} €. Gastos: ${exp.toLocaleString('es-ES')} €. ¿Cuál es el resultado?`,[right,'Resultado cero',`Pérdida de ${(inc+exp).toLocaleString('es-ES')} €`],0,'Calcula ingresos menos gastos.',`Resultado = ingresos − gastos = ${(inc-exp).toLocaleString('es-ES')} €.`,practical?'practical':'reinforcement');continue;
      }
      if(ce==='RA2.h'){
        const v=[['El asiento que traslada al nuevo ejercicio los saldos patrimoniales iniciales es…',['el asiento de apertura','el asiento de cierre','el balance de comprobación'],0],['Al terminar el ejercicio, el asiento que deja saldadas las cuentas patrimoniales es…',['el asiento de cierre','el asiento de apertura','un asiento de cobro'],0],['¿Qué relación existe entre cierre y apertura?',['Los saldos patrimoniales del cierre enlazan con la apertura siguiente','No existe continuidad entre ejercicios','La apertura elimina el patrimonio neto'],0]][i%3];add(ce,i,`Recuperación ${n}. ${v[0]}`,v[1],v[2],'Piensa si estás terminando un ejercicio o comenzando el siguiente.',`La idea clave es: ${v[1][v[2]]}.`);continue;
      }
      if(ce==='RA2.i'){
        const v=[['Quieres conocer activo, patrimonio neto y pasivo en una fecha. ¿Qué cuenta anual consultas?',['Balance de situación','Pérdidas y ganancias','Libro Diario'],0],['Quieres explicar cómo se ha formado el resultado mediante ingresos y gastos. ¿Qué cuenta anual consultas?',['Cuenta de pérdidas y ganancias','Balance de situación','Libro Mayor'],0],['Necesitas información explicativa complementaria a los estados principales. ¿Qué documento consultas?',['Memoria','Libro Diario','Balance de comprobación'],0],['¿Cuál pertenece a las cuentas anuales?',['Balance de situación','Libro Mayor','Libro Diario'],0]][i%4];add(ce,i,`Recuperación ${n}. ${v[0]}`,v[1],v[2],'Identifica qué información necesitas y qué documento la presenta.',`La idea clave es: ${v[1][v[2]]}.`);continue;
      }
    }
  }
  if(bank.length!==300)throw new Error(`Banco recuperación incorrecto: ${bank.length}`);
  C.recoveryBank=bank;C.recoveryDistribution=distribution;
})();
