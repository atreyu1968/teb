(function(){
  const IGIC=0.07;
  const accounts={
    '100':'Capital social',
    '216':'Mobiliario',
    '217':'Equipos para procesos de información',
    '400':'Proveedores',
    '410':'Acreedores por prestaciones de servicios',
    '430':'Clientes',
    '523':'Proveedores de inmovilizado a corto plazo',
    '570':'Caja, euros',
    '572':'Bancos c/c',
    '600':'Compras de mercaderías',
    '621':'Arrendamientos y cánones',
    '628':'Suministros',
    '629':'Otros servicios',
    '700':'Ventas de mercaderías',
    '705':'Prestaciones de servicios',
    '4727':'Hacienda Pública, IGIC soportado',
    '4777':'Hacienda Pública, IGIC repercutido'
  };
  const line=(account,debit=0,credit=0)=>({account,debit:Number(debit.toFixed(2)),credit:Number(credit.toFixed(2))});
  const op=(id,date,description,entries,criteria,hints,reasoning)=>({id,date,description,entries,criteria,hints,reasoning});
  const q=x=>Number((x*IGIC).toFixed(2));
  const d=(n)=>String(n).padStart(2,'0')+'/10/2026';

  const F={
    capital:(id,date,a)=>op(id,date,`Los socios aportan ${a.toFixed(2)} € mediante transferencia bancaria.`,[line('572',a),line('100',0,a)],['RA2.b','RA2.c','RA2.d'],['¿Qué recurso entra en la empresa?','Bancos aumenta y es una cuenta de activo.','El aumento de activo va al Debe; el aumento del patrimonio neto va al Haber.'],['Aumenta Bancos','Aumenta Capital','Debe = Haber']),
    furnitureBank:(id,date,a)=>op(id,date,`Se compra mobiliario por ${a.toFixed(2)} € y se paga por banco.`,[line('216',a),line('572',0,a)],['RA2.b','RA2.c','RA2.d'],['¿Qué bien entra y qué recurso sale?','Mobiliario aumenta; Bancos disminuye.','Aumento de activo: Debe. Disminución de activo: Haber.'],['Aumenta Mobiliario','Disminuye Bancos','Dos cuentas de activo cambian en sentidos opuestos']),
    computerCredit:(id,date,a)=>op(id,date,`Se adquieren equipos informáticos por ${a.toFixed(2)} €, quedando pendientes de pago al proveedor del inmovilizado.`,[line('217',a),line('523',0,a)],['RA2.b','RA2.c','RA2.d'],['La empresa recibe un inmovilizado pero todavía no paga.','Equipos informáticos aumenta; también nace una deuda específica por inmovilizado.','217 aumenta en Debe; 523 aumenta en Haber.'],['Aumenta Equipos informáticos','Aumenta la deuda con el proveedor de inmovilizado','Debe = Haber']),
    payFixedAssetSupplier:(id,date,a)=>op(id,date,`Se pagan ${a.toFixed(2)} € al proveedor de inmovilizado mediante banco.`,[line('523',a),line('572',0,a)],['RA2.c','RA2.d'],['¿Qué deuda disminuye?','La 523 disminuye y también Bancos.','Disminución de pasivo: Debe. Disminución de activo: Haber.'],['Disminuye la deuda 523','Disminuye Bancos','El pago no crea un gasto nuevo']),
    paySupplier:(id,date,a)=>op(id,date,`Se pagan ${a.toFixed(2)} € a proveedores de mercaderías mediante banco.`,[line('400',a),line('572',0,a)],['RA2.c','RA2.d'],['¿Qué deuda disminuye?','Proveedores disminuye y Bancos disminuye.','Disminución del pasivo: Debe. Disminución del activo: Haber.'],['Disminuye Proveedores','Disminuye Bancos','El pago cancela una deuda ya registrada']),
    serviceCash:(id,date,a)=>op(id,date,`Se presta un servicio por ${a.toFixed(2)} € y se cobra en efectivo.`,[line('570',a),line('705',0,a)],['RA2.c','RA2.d','RA2.f'],['Se produce un ingreso y entra dinero en caja.','Caja aumenta; Prestaciones de servicios es un ingreso.','Aumento de activo: Debe. El ingreso se registra en el Haber.'],['Aumenta Caja','Aumenta un ingreso','Cobro e ingreso coinciden en esta operación']),
    serviceCredit:(id,date,a)=>op(id,date,`Se presta un servicio por ${a.toFixed(2)} € que queda pendiente de cobro.`,[line('430',a),line('705',0,a)],['RA2.c','RA2.d','RA2.f'],['La empresa ha generado un ingreso aunque todavía no ha cobrado.','Clientes representa el derecho de cobro.','Clientes aumenta en Debe; el ingreso va al Haber.'],['Aumenta Clientes','Aumenta un ingreso','Ingreso y cobro pueden ocurrir en fechas distintas']),
    collectClient:(id,date,a)=>op(id,date,`Se cobran por banco ${a.toFixed(2)} € de un cliente cuya deuda ya estaba registrada.`,[line('572',a),line('430',0,a)],['RA2.c','RA2.d'],['No hay un ingreso nuevo: ya se reconoció antes.','Bancos aumenta; Clientes disminuye.','Aumento de activo: Debe. Disminución de activo: Haber.'],['Aumenta Bancos','Disminuye Clientes','Se transforma un derecho de cobro en tesorería']),
    rentBank:(id,date,a)=>op(id,date,`Se paga por banco el alquiler del local: ${a.toFixed(2)} €.`,[line('621',a),line('572',0,a)],['RA2.c','RA2.d','RA2.f'],['El alquiler consumido es un gasto.','El gasto aumenta y Bancos disminuye.','Los gastos se cargan; Bancos se abona al disminuir.'],['Aumenta un gasto','Disminuye Bancos','El gasto se registra en el Debe']),
    suppliesBank:(id,date,a)=>op(id,date,`Se paga por banco una factura de suministros por ${a.toFixed(2)} €.`,[line('628',a),line('572',0,a)],['RA2.c','RA2.d','RA2.f'],['Identifica primero el gasto consumido.','Suministros es gasto; Bancos disminuye.','Gasto al Debe; disminución de activo al Haber.'],['Aumenta Suministros','Disminuye Bancos','Debe = Haber']),
    otherServiceCredit:(id,date,a)=>op(id,date,`Se recibe un servicio profesional por ${a.toFixed(2)} € que queda pendiente de pago.`,[line('629',a),line('410',0,a)],['RA2.b','RA2.c','RA2.d','RA2.f'],['El servicio ya se ha consumido aunque aún no se haya pagado.','629 representa el gasto y 410 la deuda con el acreedor.','Gasto al Debe; deuda que aumenta al Haber.'],['Aumenta un gasto','Aumenta una deuda con acreedores','Gasto y pago pueden ocurrir en fechas distintas']),
    payCreditor:(id,date,a)=>op(id,date,`Se pagan ${a.toFixed(2)} € al acreedor por prestaciones de servicios mediante banco.`,[line('410',a),line('572',0,a)],['RA2.c','RA2.d'],['La deuda con el acreedor ya existe.','410 disminuye; Bancos también disminuye.','Disminución de pasivo al Debe y de activo al Haber.'],['Disminuye Acreedores','Disminuye Bancos','El pago no genera otro gasto']),
    goodsCredit:(id,date,a)=>op(id,date,`Se compran mercaderías por ${a.toFixed(2)} € a crédito, sin considerar todavía IGIC.`,[line('600',a),line('400',0,a)],['RA2.c','RA2.d','RA2.f'],['La compra se registra como compra de mercaderías.','Aumenta la compra/gasto y aumenta la deuda con proveedores.','600 al Debe; 400 al Haber.'],['Aumenta Compras','Aumenta Proveedores','No hay salida de banco en una compra a crédito']),
    saleCredit:(id,date,a)=>op(id,date,`Se venden mercaderías por ${a.toFixed(2)} € a crédito, sin considerar todavía IGIC.`,[line('430',a),line('700',0,a)],['RA2.c','RA2.d','RA2.f'],['La venta genera un derecho de cobro.','Clientes aumenta y Ventas es un ingreso.','Clientes al Debe; Ventas al Haber.'],['Aumenta Clientes','Aumenta Ventas','No hay cobro todavía']),
    buyIgic:(id,date,a)=>{const tax=q(a),total=a+tax;return op(id,date,`Factura de compra de mercaderías: base ${a.toFixed(2)} €, IGIC general 7 % (${tax.toFixed(2)} €), total ${total.toFixed(2)} €, pendiente de pago.`,[line('600',a),line('4727',tax),line('400',0,total)],['RA2.c','RA2.d','RA2.f'],['Separa base imponible, IGIC y total.','4727 recoge el IGIC soportado deducible.','600 y 4727 al Debe; 400 por el total al Haber.'],['Base → 600 Compras','IGIC soportado → 4727','Total deuda → 400 Proveedores'])},
    sellIgic:(id,date,a)=>{const tax=q(a),total=a+tax;return op(id,date,`Factura por prestación de servicios: base ${a.toFixed(2)} €, IGIC general 7 % (${tax.toFixed(2)} €), total ${total.toFixed(2)} €, pendiente de cobro.`,[line('430',total),line('705',0,a),line('4777',0,tax)],['RA2.c','RA2.d','RA2.f'],['Separa base imponible, IGIC y total.','El cliente debe el total; 4777 recoge el IGIC repercutido.','430 al Debe por el total; 705 y 4777 al Haber.'],['Total derecho de cobro → 430','Base del servicio → 705','IGIC repercutido → 4777'])}
  };

  function coherentOps(seed,count){
    const a=12000+seed*500, f=500+(seed%4)*100, eq=900+(seed%5)*100;
    const service1=800+(seed%4)*100, collect1=Math.round(service1*.5);
    const goods1=700+(seed%5)*100, pay1=Math.round(goods1*.5);
    const rent=450+(seed%4)*50, supplies=160+(seed%5)*20, cash=300+(seed%4)*50;
    const buyBase=500+(seed%5)*100, sellBase=700+(seed%4)*100;
    const other=240+(seed%4)*40, payOther=Math.round(other*.5);
    const service2=600+(seed%5)*100, collect2=Math.round(service2*.4);
    const goods2=550+(seed%4)*100, pay2=Math.round(goods2*.45);
    const fixedPay=Math.round(eq*.4);
    const sequence=[
      ()=>F.capital('',d(1),a),
      ()=>F.furnitureBank('',d(2),f),
      ()=>F.computerCredit('',d(3),eq),
      ()=>F.serviceCredit('',d(4),service1),
      ()=>F.collectClient('',d(5),collect1),
      ()=>F.goodsCredit('',d(6),goods1),
      ()=>F.paySupplier('',d(7),pay1),
      ()=>F.rentBank('',d(8),rent),
      ()=>F.suppliesBank('',d(9),supplies),
      ()=>F.serviceCash('',d(10),cash),
      ()=>F.buyIgic('',d(11),buyBase),
      ()=>F.sellIgic('',d(12),sellBase),
      ()=>F.otherServiceCredit('',d(13),other),
      ()=>F.payCreditor('',d(14),payOther),
      ()=>F.serviceCredit('',d(15),service2),
      ()=>F.collectClient('',d(16),collect2),
      ()=>F.goodsCredit('',d(17),goods2),
      ()=>F.paySupplier('',d(18),pay2),
      ()=>F.payFixedAssetSupplier('',d(19),fixedPay),
      ()=>F.serviceCash('',d(20),cash+150)
    ];
    return sequence.slice(0,count).map((maker,i)=>{const x=maker();x.id=`S${seed}-O${i+1}`;return x});
  }

  const scenarios=[
    {id:1,stage:'demo',evaluated:false,title:'Mi primer asiento',subtitle:'Aprende la interfaz y el razonamiento contable paso a paso.',operations:[F.capital('S1-O1',d(1),10000),F.furnitureBank('S1-O2',d(2),1200),F.serviceCash('S1-O3',d(3),400),F.serviceCredit('S1-O4',d(4),650),F.collectClient('S1-O5',d(5),300)]},
    {id:2,stage:'demo',evaluated:false,title:'Mi primera semana contable',subtitle:'Practica compras, deudas, cobros, pagos, gastos e ingresos.',operations:coherentOps(2,8)},
    {id:3,stage:'demo',evaluated:false,title:'Mi primer ciclo contable',subtitle:'Del Diario al Mayor, balance de comprobación y resultado.',operations:coherentOps(3,10)},
    {id:4,stage:'guided',evaluated:false,title:'Librería Atlántico',subtitle:'Práctica guiada en una empresa comercial.',operations:coherentOps(4,9)},
    {id:5,stage:'guided',evaluated:false,title:'Servicios Teide',subtitle:'Práctica guiada en una empresa de servicios.',operations:coherentOps(5,9)},
    {id:6,stage:'guided',evaluated:false,title:'Jardines del Sur',subtitle:'Práctica guiada con cobros, pagos y gastos.',operations:coherentOps(6,10)},
    {id:7,stage:'guided',evaluated:false,title:'Informática Canarias',subtitle:'Última práctica antes del trabajo autónomo.',operations:coherentOps(7,10)},
    {id:8,stage:'portfolio',evaluated:true,title:'Comercial Anaga',subtitle:'Práctica autónoma evaluable.',operations:coherentOps(8,11)},
    {id:9,stage:'portfolio',evaluated:true,title:'Asesoría Gara',subtitle:'Práctica autónoma evaluable.',operations:coherentOps(9,11)},
    {id:10,stage:'portfolio',evaluated:true,title:'Oficina Acentejo',subtitle:'Práctica autónoma evaluable.',operations:coherentOps(10,12)},
    {id:11,stage:'audit',evaluated:true,title:'Auditor contable I',subtitle:'Corrige asientos que contienen errores de cuenta, lado o importe.',operations:coherentOps(11,12)},
    {id:12,stage:'audit',evaluated:true,title:'Auditor contable II',subtitle:'Detecta incidencias y reconstruye los registros correctos.',operations:coherentOps(12,14)},
    {id:13,stage:'integrative',evaluated:true,title:'Caso integrador de preparación',subtitle:'Resuelve un ciclo básico completo con ayudas sólo tras error.',operations:coherentOps(13,16)},
    {id:14,stage:'integrative',evaluated:true,title:'Gran reto · Cierre mensual de Atlántico Gestión Canarias',subtitle:'Producto final del portafolio de la UD2.',operations:coherentOps(14,20)}
  ];

  const W=1/9;
  const criteria={
    'RA2.a':{label:'Fases del ciclo contable',weight:W},
    'RA2.b':{label:'La cuenta como instrumento de representación',weight:W},
    'RA2.c':{label:'Método de partida doble',weight:W},
    'RA2.d':{label:'Cargo, abono, Debe y Haber',weight:W},
    'RA2.e':{label:'Balance de comprobación',weight:W},
    'RA2.f':{label:'Cuentas de ingresos y gastos',weight:W},
    'RA2.g':{label:'Resultado contable',weight:W},
    'RA2.h':{label:'Apertura y cierre',weight:W},
    'RA2.i':{label:'Función de las cuentas anuales',weight:W}
  };

  window.TEB_UD2={
    id:'teb-ud2-ra2',version:'1.0.0',title:'UD2 · La lógica de la contabilidad: cuenta y partida doble',hours:20,
    portfolioWeight:0.60,examWeight:0.40,igicRate:IGIC,
    accountRule:'Todas las cuentas se trabajan a tres dígitos, salvo 4727 y 4777 para IGIC.',
    accounts,criteria,scenarios,activityBank:[]
  };
})();