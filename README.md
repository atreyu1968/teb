# TEB · Técnica Contable

Aplicación didáctica y de seguimiento para el módulo **0441 · Técnica Contable** del CFGM Gestión Administrativa (Canarias).

## Estado inicial

Esta versión desarrolla la **Unidad 1 · El patrimonio empresarial en Canarias**, asociada al **RA1**, con una duración programada de **14 horas**.

### Criterios cubiertos

- RA1.a · Fases del ciclo económico de la actividad empresarial.
- RA1.b · Inversión/financiación, inversión/gasto, gasto/pago e ingreso/cobro.
- RA1.c · Sectores económicos y tipología de actividades.
- RA1.d · Patrimonio, elemento patrimonial y masa patrimonial.
- RA1.e · Activo, pasivo exigible y patrimonio neto.
- RA1.f · Relación de las masas patrimoniales con el ciclo económico.
- RA1.g · Clasificación y ordenación de elementos patrimoniales en masas.

## Objetivos de la aplicación

- Ofrecer un SCORM/entorno didáctico amplio, interactivo y autocorregible, suficiente para cubrir las 14 horas de la UD1.
- Registrar progreso por alumno, sesión, actividad y criterio de evaluación.
- Permitir reanudación desde el último punto guardado.
- Incorporar un panel docente para seguimiento individual y de grupo.
- Permitir al administrador crear, editar, activar/desactivar y borrar usuarios.
- Ejecutarse en un servidor Ubuntu sin Docker, con Node.js y SQLite.

## Arquitectura prevista

- `server/` · backend Node.js + SQLite.
- `web/` · interfaz del alumnado y panel de administración.
- `install.sh` · instalación/actualización desatendida en Ubuntu.
- `server/teb.service.template` · servicio systemd.

## Despliegue

La instalación automatizada y la configuración completa se irán documentando en este README a medida que se incorporen las funciones del servidor, el panel de administración y la UD1.
