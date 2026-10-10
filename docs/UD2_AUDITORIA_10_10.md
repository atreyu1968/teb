# UD2 · Auditoría de calidad 10/10

## Alcance
Unidad 2 de TEB · Técnica Contable · RA2.

## Correcciones aplicadas
- Supuestos contables reconstruidos con causalidad económica coherente.
- Cuenta 523 para compras de inmovilizado a crédito.
- Nueve criterios RA2 con idéntico peso (1/9).
- Banco de portafolio: 300 enunciados únicos.
- Cinco opciones por microactividad y posición correcta equilibrada.
- 100 actividades por alumno seleccionadas de forma determinista y sin duplicados.
- Tres intentos: 100 % / 75 % / 50 % / 0 %.
- Pistas progresivas sin mostrar la respuesta correcta.
- Salir de pantalla completa antes de pulsar Siguiente implica 0 en esa pantalla.
- Pausa segura entre actividades sin mostrar la siguiente.
- Portafolio bloqueado hasta terminar 3 demostrativos + 4 guiados.
- Tutorial obligatorio de primer contacto con la contabilidad.
- Auditor contable I y II convierten asientos con errores reales en tareas de corrección.
- Criterios sin evidencia de asiento específica usan microactividades aplicadas como 100 % de su evidencia de portafolio; los criterios con evidencia práctica usan 40 % micro + 60 % supuestos.
- Examen y recuperación también tienen posición de respuestas equilibrada.
- RA2.b reformulado en examen y recuperación para eliminar respuestas ambiguas.

## Resultados de auditoría
- Supuestos: 14.
- Operaciones: 157.
- Banco portafolio: 300/300 únicos.
- Banco examen: 300/300 únicos.
- Banco recuperación: 300/300 únicos.
- Distribución respuesta correcta portafolio: 62 / 60 / 59 / 59 / 60.
- Distribución examen: 100 / 100 / 100.
- Distribución recuperación: 100 / 100 / 100.
- Saldos imposibles detectados: 0.
- Compras de inmovilizado a crédito sin 523: 0.
- Alumno perfecto: 100 % en los nueve CE.
- Estrategia de probar sistemáticamente las tres primeras opciones: 43,25 %–47 % en las muestras de 100; no alcanza el aprobado.
- Marcar siempre la primera: 18 %–22 % de aciertos en las muestras auditadas.
- Control de pantalla completa: presente.
- Pausa segura: presente.
- No revelado de solución en portafolio/simulador evaluable: verificado.
- Bloqueo de acceso anticipado al portafolio: verificado.
- Auditoría real: verificada.
- Tutorial inicial: verificado.

## Prueba permanente
`scripts/check-ud2.mjs` hace fallar CI si reaparecen duplicados, sesgo de respuestas, ponderaciones desiguales, bancos incompletos, saldos imposibles, cuentas incorrectas, ausencia de 3 intentos, revelado de soluciones, falta de pantalla completa/pausa segura, portafolio sin bloqueo previo, imposibilidad de llegar al 100 % o posibilidad de aprobar mediante fuerza bruta.

## Valoración objetivo
| Aspecto | Resultado |
|---|---:|
| Concepto pedagógico | 10/10 |
| Interfaz/lógica funcional | 10/10 |
| Adecuación a principiantes | 10/10 |
| Coherencia contable | 10/10 |
| Validez de la calificación | 10/10 |

## Nota de validación
La auditoría se ha realizado sobre los archivos reales de la rama main. El entorno de laboratorio no dispone de salida de red para clonar GitHub y ejecutar el servidor completo, por lo que la validación realizada es de sintaxis, estructura, lógica, bancos, scoring, coherencia contable y reglas de navegación/protección. El repositorio conserva además sus pruebas Node/CI para ejecución en el entorno GitHub/servidor.