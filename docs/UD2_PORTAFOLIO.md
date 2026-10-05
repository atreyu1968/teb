# UD2 · Portafolio práctico y simulador contable

## Decisiones pedagógicas cerradas

- RA2 completo: **20 horas**.
- Calificación del RA2: **portafolio 60 % + examen 40 %**.
- El portafolio se apoya en práctica continuada, no en una secuencia de test.
- Interfaz común para aprendizaje y evaluación: **Diario, Mayor, balance de comprobación, resultado y progreso**.
- Todas las cuentas se presentan a **tres dígitos**, salvo las subcuentas de IGIC **4727 · IGIC soportado** y **4777 · IGIC repercutido**.
- En UD2 los códigos se pueden localizar mediante catálogo/buscador: se pretende comprender la metodología contable; la memorización sistemática del PGC se desarrolla en la UD3.
- Antes del portafolio hay **3 supuestos demostrativos obligatorios y no evaluables**.
- Los errores activan pistas de razonamiento progresivas. En los supuestos evaluables hay **2 intentos** por operación.
- El sistema diferencia entre **equilibrio matemático** (Debe = Haber) y **corrección de la lógica contable**.

## Los 14 supuestos

| Nº | Tipo | Evaluación | Finalidad |
|---:|---|---|---|
| 1 | Demostración | No | Primer asiento y manejo de la interfaz |
| 2 | Demostración | No | Primera semana contable |
| 3 | Demostración | No | Diario → Mayor → balance → resultado |
| 4 | Guiado | No | Librería Atlántico |
| 5 | Guiado | No | Servicios Teide |
| 6 | Guiado | No | Jardines del Sur |
| 7 | Guiado | No | Informática Canarias |
| 8 | Portafolio | Sí | Comercial Anaga |
| 9 | Portafolio | Sí | Asesoría Gara |
| 10 | Portafolio | Sí | Oficina Acentejo |
| 11 | Auditoría | Sí | Detección/corrección de errores I |
| 12 | Auditoría | Sí | Detección/corrección de errores II |
| 13 | Integrador | Sí | Preparación del reto final |
| 14 | Integrador | Sí | Cierre mensual de Atlántico Gestión Canarias |

La versión inicial incorpora **157 operaciones contables** distribuidas entre los 14 supuestos y un **banco de 300 microactividades** generado de forma determinista a partir de operaciones etiquetadas por criterio y dificultad.

## Criterios y ponderación interna del RA2

| Criterio | Peso dentro del RA2 |
|---|---:|
| RA2.a | 10 % |
| RA2.b | 10 % |
| RA2.c | 12,5 % |
| RA2.d | 12,5 % |
| RA2.e | 10 % |
| RA2.f | 10 % |
| RA2.g | 10 % |
| RA2.h | 10 % |
| RA2.i | 15 % |

Cada evidencia debe conservar el criterio, el tipo de error, los intentos empleados, las pistas utilizadas y la puntuación para poder generar posteriormente un plan de recuperación selectivo.

## Comportamiento del simulador

### Modo demostración

- Intentos ilimitados.
- Razonamiento visible paso a paso.
- Pistas a demanda y tras error.
- Corrección inmediata.
- Sin calificación.

### Modo guiado

- Procedimiento de razonamiento visible.
- Pistas progresivas.
- Sin impacto en la nota.
- Prepara la retirada de andamios.

### Modo portafolio / auditoría / integrador

- Dos intentos por operación.
- Primer error: se activa una pista, no la solución.
- Segundo error: se muestra razonamiento completo y asiento correcto; la operación queda registrada con puntuación 0 para conservar la trazabilidad del aprendizaje.
- Acierto al primer intento: 100 %.
- Acierto al segundo intento: 75 %.

## Vistas profesionales

1. **Diario**: cuenta, descripción, Debe y Haber, con validación de cuenta y cuadratura.
2. **Mayor**: se actualiza automáticamente a partir de los asientos aceptados y calcula saldo deudor/acreedor.
3. **Balance de comprobación**: sumas Debe/Haber y saldos deudores/acreedores.
4. **Resultado**: cálculo didáctico de ingresos menos gastos con las cuentas de los grupos 7 y 6 utilizadas en el caso.
5. **Progreso**: evidencias evaluables por criterio del RA2.

## Archivos

- `web/ud2-course.js`: catálogo de cuentas, criterios, 14 supuestos y banco de 300 actividades.
- `web/ud2-simulator.html`: interfaz del simulador.
- `web/ud2-simulator.css`: diseño profesional y adaptable.
- `web/ud2-simulator.js`: Diario, Mayor, balance, resultado, pistas, intentos y progreso.
- `scripts/check-ud2.mjs`: controles de calidad de estructura, número de supuestos, banco, cuentas y cuadratura de asientos.

## Pendiente para integración completa con TEB

La versión estable actual de TEB utiliza un único `course_id` (UD1). Antes de mezclar esta rama en producción se debe convertir el backend a multiunidad para que UD1 y UD2 conserven de forma independiente progreso, eventos, criterios, tiempos y exportaciones. El simulador ya emite `teb-activity-result`, por lo que queda preparado para esa integración.
