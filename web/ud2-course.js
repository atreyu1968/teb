(function(){
  const IGIC=0.07;
  const accounts={
    '100':'Capital social','216':'Mobiliario','217':'Equipos para procesos de información','300':'Mercaderías','400':'Proveedores','410':'Acreedores por prestaciones de servicios','430':'Clientes','570':'Caja, euros','572':'Bancos c/c','600':'Compras de mercaderías','621':'Arrendamientos y cánones','628':'Suministros','629':'Otros servicios','700':'Ventas de mercaderías','705':'Prestaciones de servicios','4727':'Hacienda Pública, IGIC soportado','4777':'Hacienda Pública, IGIC repercutido'
  };
  const line=(account,debit=0,credit=0)=>({account,debit:Number(debit.toFixed(2)),credit:Number(credit.toFixed(2))});
  const op=(id,date,description,entries,criteria,hints,reasoning)=>({id,date,description,entries,criteria,hints,reasoning});
  const q=x=>Number((x*IGIC).toFixed(2));

  const F={
    capital:(id,date,a)=>op(id,date,`Los socios aportan ${a.toFixed(2)} € mediante transferencia bancaria.`,[line('572',a),line('100',0,a)],['RA2.b','RA2.c','RA2.d'],['¿Qué recurso entra en la empresa?','Bancos aumenta y es una cuenta de activo.','El aumento de activo va al Debe; el aumento del patrimonio neto va al Haber.'],['Aumenta Bancos','Aumenta Capital','Debe = Haber']),
    furnitureBank:(id,date,a)=>op(id,date,`Se compra mobiliario por ${a.toFixed(2)} € y se paga por banco.`,[line('216',a),line('572',0,a)],['RA2.b','RA2.c','RA2.d'],['No pienses aún en Debe/Haber: ¿qué entra y qué sale?','Mobiliario aumenta; Bancos disminuye.','Aumento de activo: Debe. Disminución de activo: Haber.'],['Aumenta Mobiliario','Disminuye Bancos','Dos cuentas de activo cambian en sentidos opuestos']),
    computerCredit:(id,date,a)=>op(id,date,`Se adquieren equipos informáticos por ${a.toFixed(2)} €, quedando pendientes de pago.`,[line('217',a),line('400',0,a)],['RA2.b','RA2.c','RA2.d'],['La empresa recibe un bien pero todavía no paga.','Equipos informáticos aumenta; también aumenta una deuda.','Activo que aumenta: Debe. Pasivo que aumenta: Haber.'],['Aumenta Equipos informáticos','Aumenta Proveedores','Se reconoce una obligación de pago']),
    paySupplier:(id,date,a)=>op(id,date,`Se pagan ${a.toFixed(2)} € a proveedores mediante banco.`,[line('400',a),line('572',0,a)],['RA2.c','RA2.d'],['¿Qué deuda desaparece o disminuye?','Proveedores disminuye y Bancos disminuye.','Disminución del pasivo: Debe. Disminución del activo: Haber.'],['Disminuye Proveedores','Disminuye Bancos','El pago cancela deuda, no crea un gasto nuevo']),
    serviceCash:(id,date,a)=>op(id,date,`Se presta un servicio por ${a.toFixed(2)} € y se cobra en efectivo.`,[line('570',a),line('705',0,a)],['RA2.c','RA2.d','RA2.f'],['Se produce un ingreso y entra dinero en caja.','Caja aumenta; Prestaciones de servicios es un ingreso.','Aumento de activo: Debe. El ingreso se registra en el Haber.'],['Aumenta Caja','Aumenta un ingreso','Cobro e ingreso coinciden en esta operación']),
    serviceCredit:(id,date,a)=>op(id,date,`Se presta un servicio por ${a.toFixed(2)} € que queda pendiente de cobro.`,[line('430',a),line('705',0,a)],['RA2.c','RA2.d','RA2.f'],['La empresa ha generado un ingreso aunque todavía no ha cobrado.','Clientes representa el derecho de cobro.','Clientes aumenta en Debe; el ingreso va al Haber.'],['Aumenta Clientes','Aumenta un ingreso','Ingreso y cobro pueden ocurrir en fechas distintas']),
    collectClient:(id,date,a)=>op(id,date,`Se cobran por banco ${a.toFixed(2)} € de un cliente que debía ese importe.`,[line('572',a),line('430',0,a)],['RA2.c','RA2.d'],['No hay un ingreso nuevo: ya se reconoció antes.','Bancos aumenta; Clientes disminuye.','Aumento de activo: Debe. Disminución de activo: Haber.'],['Aumenta Bancos','Disminuye Clientes','Se transforma un derecho de cobro en tesorería']),
    rentBank:(id,date,a)=>op(id,date,`Se paga por banco el alquiler del local: ${a.toFixed(2)} €.`,[line('621',a),line('572',0,a)],['RA2.c','RA2.d','RA2.f'],['El alquiler consumido es un gasto.','El gasto aumenta y Bancos disminuye.','Los gastos se cargan; Bancos se abona al disminuir.'],['Aumenta un gasto','Disminuye Bancos','El gasto se registra en el Debe']),
    suppliesBank:(id,date,a)=>op(id,date,`Se paga por banco una factura de suministros por ${a.toFixed(2)} €.`,[line('628',a),line('572',0,a)],['RA2.c','RA2.d','RA2.f'],['Identifica primero el gasto consumido.','Suministros es gasto; Bancos disminuye.','Gasto al Debe; disminución de activo al Haber.'],['Aumenta Suministros','Disminuye Bancos','Debe = Haber']),
    goodsCredit:(id,date,a)=>op(id,date,`Se compran mercaderías por ${a.toFixed(2)} € a crédito, sin considerar todavía IGIC.`,[line('600',a),line('400',0,a)],['RA2.c','RA2.d','RA2.f'],['La compra se registra como compra de mercaderías.','Aumenta el gasto/compra y aumenta la deuda con proveedores.','Compra al Debe; Proveedores al Haber.'],['Aumenta Compras','Aumenta Proveedores','No hay salida de banco en una compra a crédito']),
    saleCredit:(id,date,a)=>op(id,date,`Se venden mercaderías por ${a.toFixed(2)} € a crédito, sin considerar todavía IGIC.`,[line('430',a),line('700',0,a)],['RA2.c','RA2.d','RA2.f'],['La venta genera un derecho de cobro.','Clientes aumenta y Ventas es un ingreso.','Clientes al Debe; Ventas al Haber.'],['Aumenta Clientes','Aumenta Ventas','No hay cobro todavía']),
    buyIgic:(id,date,a)=>{const tax=q(a),total=a+tax;return op(id,date,`Factura de compra de mercaderías: base ${a.toFixed(2)} €, IGIC general 7 % (${tax.toFixed(2)} €), total ${total.toFixed(2)} €, pendiente de pago.`,[line('600',a),line('4727',tax),line('400',0,total)],['RA2.c','RA2.d','RA2.f'],['Separa base imponible, IGIC y total.','La cuenta 4727 recoge el IGIC soportado deducible.','Compras e IGIC soportado al Debe; Proveedores por el total al Haber.'],['Base → 600 Compras','IGIC soportado → 4727','Total deuda → 400 Proveedores'])},
    sellIgic:(id,date,a)=>{const tax=q(a),total=a+tax;return op(id,date,`Factura por prestación de servicios: base ${a.toFixed(2)} €, IGIC general 7 % (${tax.toFixed(2)} €), total ${total.toFixed(2)} €, pendiente de cobro.`,[line('430',total),line('705',0,a),line('4777',0,tax)],['RA2.c','RA2.d','RA2.f'],['Separa base imponible, IGIC y total.','El cliente debe el total; 4777 recoge el IGIC repercutido.','Clientes al Debe por el total; ingreso e IGIC repercutido al Haber.'],['Total derecho de cobro → 430','Base del servicio → 705','IGIC repercutido → 4777'])}
  };

  function buildOps(seed,count,withIgic=false){
    const makers=['furnitureBank','computerCredit','paySupplier','serviceCash','serviceCredit','collectClient','rentBank','suppliesBank','goodsCredit','saleCredit'];
    const igicMakers=['buyIgic','sellIgic'];
    const out=[];
    for(let i=0;i<count;i++){
      const pool=withIgic && i%5===4 ? igicMakers : makers;
      const name=pool[(seed+i*3)%pool.length];
      const amount=100+(((seed+1)*137+i*173)%18)*50;
      const day=String(2+i).padStart(2,'0');
      out.push(F[name](`S${seed}-O${i+1}`,`${day}/10/2026`,amount));
    }
    return out;
  }

  const scenarios=[
    {id:1,stage:'demo',evaluated:false,title:'Mi primer asiento',subtitle:'Aprende la interfaz y el razonamiento contable paso a paso.',operations:[F.capital('S1-O1','01/10/2026',10000),F.furnitureBank('S1-O2','02/10/2026',1200),F.serviceCash('S1-O3','03/10/2026',400),F.serviceCredit('S1-O4','04/10/2026',650),F.collectClient('S1-O5','05/10/2026',650)]},
    {id:2,stage:'demo',evaluated:false,title:'Mi primera semana contable',subtitle:'Practica compras, deudas, cobros, pagos, gastos e ingresos.',operations:[F.capital('S2-O1','01/10/2026',12000),F.computerCredit('S2-O2','02/10/2026',1800),F.paySupplier('S2-O3','03/10/2026',600),F.rentBank('S2-O4','04/10/2026',750),F.suppliesBank('S2-O5','05/10/2026',220),F.serviceCredit('S2-O6','06/10/2026',900),F.collectClient('S2-O7','07/10/2026',500),F.serviceCash('S2-O8','08/10/2026',350)]},
    {id:3,stage:'demo',evaluated:false,title:'Mi primer ciclo contable',subtitle:'Del Diario al Mayor, balance de comprobación y resultado.',operations:[F.capital('S3-O1','01/10/2026',15000),F.goodsCredit('S3-O2','02/10/2026',1000),F.saleCredit('S3-O3','03/10/2026',1600),F.paySupplier('S3-O4','04/10/2026',500),F.collectClient('S3-O5','05/10/2026',900),F.rentBank('S3-O6','06/10/2026',700),F.buyIgic('S3-O7','07/10/2026',600),F.sellIgic('S3-O8','08/10/2026',1000),F.suppliesBank('S3-O9','09/10/2026',180),F.serviceCash('S3-O10','10/10/2026',420)]},
    {id:4,stage:'guided',evaluated:false,title:'Librería Atlántico',subtitle:'Práctica guiada en una empresa comercial.',operations:buildOps(4,9,true)},
    {id:5,stage:'guided',evaluated:false,title:'Servicios Teide',subtitle:'Práctica guiada en una empresa de servicios.',operations:buildOps(5,9,true)},
    {id:6,stage:'guided',evaluated:false,title:'Jardines del Sur',subtitle:'Práctica guiada con cobros, pagos y gastos.',operations:buildOps(6,10,true)},
    {id:7,stage:'guided',evaluated:false,title:'Informática Canarias',subtitle:'Última práctica antes del trabajo autónomo.',operations:buildOps(7,10,true)},
    {id:8,stage:'portfolio',evaluated:true,title:'Comercial Anaga',subtitle:'Práctica autónoma evaluable.',operations:buildOps(8,11,true)},
    {id:9,stage:'portfolio',evaluated:true,title:'Asesoría Gara',subtitle:'Práctica autónoma evaluable.',operations:buildOps(9,11,true)},
    {id:10,stage:'portfolio',evaluated:true,title:'Oficina Acentejo',subtitle:'Práctica autónoma evaluable.',operations:buildOps(10,12,true)},
    {id:11,stage:'audit',evaluated:true,title:'Auditor contable I',subtitle:'Localiza y corrige errores a partir del Diario, Mayor y balance.',operations:buildOps(11,12,true)},
    {id:12,stage:'audit',evaluated:true,title:'Auditor contable II',subtitle:'Detecta incidencias y reconstruye los registros correctos.',operations:buildOps(12,14,true)},
    {id:13,stage:'integrative',evaluated:true,title:'Caso integrador de preparación',subtitle:'Resuelve un ciclo básico completo con ayudas sólo tras error.',operations:buildOps(13,16,true)},
    {id:14,stage:'integrative',evaluated:true,title:'Gran reto · Cierre mensual de Atlántico Gestión Canarias',subtitle:'Producto final del portafolio de la UD2.',operations:buildOps(14,20,true)}
  ];

  const criteria={
    'RA2.a':{label:'Fases del ciclo contable',weight:0.10},'RA2.b':{label:'La cuenta como instrumento de representación',weight:0.10},'RA2.c':{label:'Método de partida doble',weight:0.125},'RA2.d':{label:'Cargo, abono, Debe y Haber',weight:0.125},'RA2.e':{label:'Balance de comprobación',weight:0.10},'RA2.f':{label:'Cuentas de ingresos y gastos',weight:0.10},'RA2.g':{label:'Resultado contable',weight:0.10},'RA2.h':{label:'Apertura y cierre',weight:0.10},'RA2.i':{label:'Función de las cuentas anuales',weight:0.15}
  };

  function makeActivityBank(){
    const source=scenarios.flatMap(s=>s.operations).slice(0,60);
    const types=['identify-account','increase-decrease','debit-credit','counterpart','spot-error'];
    const bank=[];
    for(let i=0;i<300;i++){
      const operation=source[i%source.length];
      bank.push({id:`UD2-A${String(i+1).padStart(3,'0')}`,type:types[i%types.length],operation,criterion:operation.criteria[i%operation.criteria.length],difficulty:1+(i%3)});
    }
    return bank;
  }

  window.TEB_UD2={
    id:'teb-ud2-ra2',version:'0.1.0',title:'UD2 · La lógica de la contabilidad: cuenta y partida doble',hours:20,portfolioWeight:0.60,examWeight:0.40,igicRate:IGIC,
    accountRule:'Todas las cuentas se trabajan a tres dígitos, salvo 4727 y 4777 para IGIC.',accounts,criteria,scenarios,activityBank:makeActivityBank()
  };
})();
