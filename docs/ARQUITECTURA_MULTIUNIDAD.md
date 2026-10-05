# TEB · Arquitectura multiunidad

## Objetivo

TEB deja de trabajar con un único `course_id` fijo. Cada unidad mantiene de forma independiente progreso, tiempo, estado, criterios, eventos y evaluación.

Unidades activas:

- `teb-ud1-ra1` · UD1 · RA1 · 14 h.
- `teb-ud2-ra2` · UD2 · RA2 · 20 h.

## Persistencia

Las tablas `progress`, `criteria_progress` y `activity_events` ya incluían `course_id`; ahora toda la API lo utiliza de forma efectiva.

Se añaden:

- `assessment_components`: conserva por alumno, unidad, instrumento y criterio las puntuaciones de portafolio y examen.
- `course_settings`: controla ajustes docentes de unidad, inicialmente la activación del examen.

## Evaluación RA2

La UD2 utiliza:

- Portafolio: 60 %.
- Examen: 40 %.

La combinación se calcula **criterio por criterio**:

```text
CE final = CE portafolio × 0,60 + CE examen × 0,40
```

Un criterio sólo se marca como superado cuando existen ambas evidencias y el resultado combinado es al menos 50 %.

## Activación del examen

El examen de UD2 permanece bloqueado en TEB mientras `exam_enabled = 0`.

El administrador puede activarlo o desactivarlo desde el panel docente. El backend también impide registrar un instrumento `exam` mientras el examen siga bloqueado.

Para Campus/Moodle, la activación sigue realizándose mediante visibilidad/restricciones del propio Moodle, ya que el paquete SCORM 1.2 no recibe de forma fiable el rol docente.

## Recuperación selectiva

`/api/recovery?courseId=teb-ud2-ra2` y su equivalente docente generan un plan sólo para criterios no superados.

Por criterio se devuelve:

- nota combinada actual;
- resultado de portafolio y examen;
- objetivo de refuerzo;
- diagnósticos de error disponibles;
- número recomendado de microactividades nuevas;
- prueba de dominio;
- necesidad o no de caso práctico específico.

La recuperación no obliga a repetir la unidad completa.

## Acceso del alumnado a UD2

`web/ud2.html` actúa como host autenticado del simulador. Utiliza el mismo código TEB y PIN que UD1 y sincroniza el estado del simulador con el backend cada 15 segundos.

Esto permite:

- reanudar en otro navegador/equipo;
- conservar tiempo y progreso por separado;
- registrar la finalización de supuestos y evidencias;
- mantener UD1 y UD2 completamente independientes.

## Pruebas automáticas

`scripts/check-multiunit.mjs` verifica:

1. que UD1 y UD2 aparecen como cursos distintos;
2. que su progreso no se mezcla;
3. que el examen UD2 está inicialmente bloqueado;
4. que el profesor puede activarlo;
5. que se aplica el 60/40 por criterio;
6. que la recuperación devuelve exclusivamente los criterios pendientes.
