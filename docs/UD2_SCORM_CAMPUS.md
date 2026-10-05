# UD2 · Paquetes SCORM 1.2 para Campus/Moodle

La UD2 se distribuye en tres paquetes SCORM 1.2 independientes para facilitar su gestión en Campus/Moodle.

## 1. Entrenamiento guiado

**TEB_UD2_01_Entrenamiento_Guiado_SCORM12.zip**

- No evaluable.
- 3 supuestos demostrativos paso a paso.
- 4 supuestos de práctica guiada.
- Diario, Mayor, balance de comprobación y resultado.
- Intentos ilimitados.
- Pistas progresivas.
- Reanudación mediante `cmi.suspend_data`.

Configuración recomendada: intentos ilimitados y finalización por estado completado. El portafolio puede condicionarse en Moodle a la finalización de esta actividad.

## 2. Portafolio evaluable

**TEB_UD2_02_Portafolio_SCORM12.zip**

- Peso del RA2: 60 %.
- Banco de 300 microactividades.
- Selección estratificada de 100 actividades por alumno/a.
- 7 supuestos contables evaluables.
- Dos intentos por actividad y operación: 100 % al primer acierto, 75 % al segundo y 0 % tras dos errores con resolución explicada.
- Diario profesional simplificado, Mayor automático y balance de comprobación.
- Informe descargable y resultados por RA2.a–RA2.i.

Configuración recomendada: 2 intentos SCORM, método de calificación «calificación más alta» y peso 60 % dentro de la categoría RA2.

## 3. Examen

**TEB_UD2_03_Examen_SCORM12.zip**

- Peso del RA2: 40 %.
- Banco independiente de 300 preguntas.
- 100 preguntas por alumno/a.
- Un solo intento.
- Penalización incorporada: **1 error = −0,5 aciertos**.
- Las preguntas en blanco no suman ni restan.
- Informe descargable por criterio.
- El intento queda bloqueado después de la entrega.

### Activación por el profesor

SCORM 1.2 no proporciona al contenido una identificación fiable del rol docente. El control de activación se realiza en Moodle:

1. mantener la actividad oculta o aplicar una restricción de acceso;
2. mostrarla o retirar la restricción cuando el profesor decida;
3. configurar **Intentos permitidos = 1**;
4. ponderar la actividad con el 40 % de RA2.

## Comunicación SCORM

Los paquetes utilizan:

- `cmi.core.lesson_status`;
- `cmi.core.score.raw`;
- `cmi.core.lesson_location`;
- `cmi.suspend_data`;
- `cmi.objectives.*` para RA2.a–RA2.i;
- `cmi.interactions.*` para respuestas e interacciones.

## Calificación

La categoría RA2 en el libro de calificaciones debe quedar:

- Portafolio: **60 %**.
- Examen: **40 %**.

La recuperación posterior se construirá a partir de los criterios RA2.a–RA2.i no superados, no a partir de una repetición completa de la unidad.
