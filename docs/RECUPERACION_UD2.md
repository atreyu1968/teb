# UD2 · Recuperación activa por criterios

## Principio

La recuperación de RA2 no repite la unidad completa. Sólo se activa para criterios con evaluación ordinaria completa y resultado inferior al 50 %.

La evidencia ordinaria se conserva siempre:

- portafolio: 60 %;
- examen: 40 %.

La recuperación se registra como una tercera evidencia independiente. No borra las notas de portafolio ni examen.

## Banco independiente

La recuperación utiliza `web/ud2-recovery-bank.js`, un tercer banco de 300 actividades con IDs y enunciados distintos de los bancos de portafolio y examen.

Distribución:

- RA2.a: 24
- RA2.b: 30
- RA2.c: 42
- RA2.d: 48
- RA2.e: 36
- RA2.f: 27
- RA2.g: 24
- RA2.h: 27
- RA2.i: 42

## Itinerario individual

Por cada criterio pendiente:

1. **Refuerzo**: 8, 10 o 12 actividades inéditas según el criterio. Dos intentos y pistas progresivas. Es formativo.
2. **Prueba de dominio**: 5 preguntas inéditas, un intento y sin pistas.
3. **Comprobación práctica**: para RA2.c, RA2.d, RA2.e, RA2.f y RA2.g se añaden 5 ítems aplicados, un intento y sin pistas.

La selección es determinista por alumno y criterio, por lo que reanudar no cambia las actividades asignadas.

## Cálculo de la recuperación

- Criterios conceptuales: prueba de dominio = 100 % de la recuperación.
- Criterios prácticos: dominio 50 % + comprobación práctica 50 %.
- Nivel de superación: 50 %.

Si la evaluación ordinaria estaba suspensa y la recuperación alcanza 50 %, el criterio pasa a estado `recovered=true`.

El servidor conserva simultáneamente:

- `portfolio`;
- `exam`;
- `regularScore` (60/40);
- `recovery`;
- `score` efectivo;
- `recovered`.

## Intentos

En TEB:

- portafolio: una entrega final, aunque las actividades internas tengan dos intentos;
- examen: un único intento;
- recuperación: una entrega por criterio.

El backend valida estas reglas, por lo que no dependen sólo de la interfaz del navegador.

## Campus/Moodle

El mismo banco de recuperación se utilizará para generar paquetes SCORM 1.2 por criterio. De esta forma el docente podrá asignar en Campus exclusivamente los SCORM correspondientes a los criterios pendientes de cada alumno.
