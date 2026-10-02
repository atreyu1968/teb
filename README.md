# TEB · Técnica Contable

Aplicación didáctica y de seguimiento para el módulo **0441 · Técnica Contable** del CFGM Gestión Administrativa en Canarias.

## Versión actual

La versión actual desarrolla la **UD1 · El patrimonio empresarial en Canarias**, asociada al **RA1**, con una duración programada de **14 horas** y trazabilidad completa de **RA1.a a RA1.g**.

### Criterios cubiertos

- **RA1.a** · Fases del ciclo económico de la actividad empresarial.
- **RA1.b** · Inversión/financiación, inversión/gasto, gasto/pago e ingreso/cobro.
- **RA1.c** · Sectores económicos y tipología de actividades.
- **RA1.d** · Patrimonio, elemento patrimonial y masa patrimonial.
- **RA1.e** · Activo, pasivo exigible y patrimonio neto.
- **RA1.f** · Relación de las masas patrimoniales con el ciclo económico.
- **RA1.g** · Clasificación y ordenación de elementos patrimoniales en masas.

## Recursos reutilizados en la UD1

TEB conserva y reutiliza los recursos interactivos ya disponibles para estos contenidos en lugar de duplicarlos.

### Micro-SCORM 1.2 originales

Los tres paquetes se mantienen como **SCORM 1.2 formativos y no evaluables**, con sus intentos, autocorrección, registro de interacciones, PDF de resultados y funciones de protección originales.

| Recurso | Integración TEB | Criterios principales |
|---|---|---|
| Micropráctica 3 · Patrimonio y masas patrimoniales | Bloque 6 | RA1.d · RA1.e |
| Micropráctica 4 · Estructura económica y financiera | Bloque 11 | RA1.f |
| Micropráctica 5 · Clasificación patrimonial | Bloque 10 | RA1.g |

TEB actúa como **LMS anfitrión SCORM 1.2**. La aplicación ofrece al paquete el objeto `window.API` esperado por SCORM y captura, entre otros datos:

- `cmi.core.student_id` y `cmi.core.student_name`;
- `cmi.core.lesson_status`;
- `cmi.core.score.raw`;
- `cmi.core.lesson_location`;
- `cmi.suspend_data` para reanudación;
- `cmi.objectives.*` para relacionar la evidencia con los criterios;
- `cmi.interactions.*` generadas por el propio paquete.

La finalización de estas microprácticas se interpreta como **actividad formativa completada**, no como aprobado/suspenso. Las puntuaciones obtenidas sí se conservan como evidencias del criterio y se muestran en el panel docente.

### Juegos reutilizados

- Práctica básica de clasificación en Activo / Pasivo / Patrimonio Neto.
- Entrenamiento avanzado por rondas, con puntuación y dificultad creciente.

Estos recursos también comunican su resultado a TEB y alimentan el historial del alumno.

## Funciones implementadas

### Alumnado

- Identificación mediante código TEB y PIN.
- Reanudación desde el último bloque trabajado.
- Itinerario de **14 bloques didácticos** de aproximadamente 55 minutos.
- Explicación, práctica y evidencia en cada bloque.
- Banco autocorregible de preguntas por criterio.
- Micro-SCORM 1.2 integrados dentro de la propia interfaz.
- Registro de intentos, puntuación, tiempo y progreso.
- Persistencia de `suspend_data` y posición de los SCORM reutilizados.
- Mapa visible de dominio de RA1.a–RA1.g.

### Panel docente / administrador

- Primera instalación con creación obligatoria del administrador.
- Gestión de grupos: alta, edición, activación/desactivación y borrado.
- Gestión de alumnado: alta, edición, activación/desactivación y borrado.
- PIN temporal configurable; valor por defecto **1234**.
- Restablecimiento de PIN.
- Código TEB generado automáticamente para cada alumno.
- Seguimiento individual de:
  - porcentaje de progreso;
  - bloque actual;
  - puntuación media;
  - tiempo acumulado;
  - dominio por cada criterio RA1.a–RA1.g;
  - resultados procedentes de los Micro-SCORM;
  - historial de actividades y evidencias.
- Exportación CSV del seguimiento.

## Arquitectura

- `server/server.mjs` · backend Node.js y API REST.
- `/var/lib/teb` · base SQLite persistente en producción.
- `web/` · interfaz del alumnado y panel docente.
- `web/course.js` · estructura didáctica completa de la UD1.
- `web/reutilizados/` · juegos y Micro-SCORM preparados para ejecución.
- `packages/` · paquetes SCORM originales codificados en fragmentos para conservarlos íntegros en Git.
- `scripts/extract-scorms.sh` · reconstrucción, validación y extracción de los Micro-SCORM.
- `install.sh` · instalación y actualización desatendida en Ubuntu.
- `server/teb.service.template` · servicio `systemd`.

No usa Docker.

## Instalación rápida en Ubuntu

En un servidor Ubuntu vacío:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
git clone https://github.com/atreyu1968/teb.git
cd teb
sudo bash install.sh
```

El instalador:

1. instala Git, cURL, certificados, `unzip` y utilidades necesarias;
2. instala Node.js 22 si es necesario;
3. crea el usuario de sistema `teb`;
4. instala o actualiza la aplicación en `/opt/teb`;
5. reconstruye los tres Micro-SCORM desde `packages/`;
6. valida cada ZIP antes de extraerlo;
7. comprueba que cada paquete contiene `index.html`, `app.js`, `scorm.js`, `styles.css`, `imsmanifest.xml` y `README_DOCENTE.txt`;
8. instala los paquetes en `web/reutilizados/`;
9. crea el directorio persistente `/var/lib/teb`;
10. configura `teb.service`;
11. activa el arranque automático y reinicia la aplicación.

Acceso inicial:

```text
http://IP_DEL_SERVIDOR:8080
```

En el primer acceso la aplicación solicitará la creación del administrador.

## Actualización

```bash
cd /opt/teb
sudo bash install.sh
```

La base de datos se conserva en `/var/lib/teb`. Los Micro-SCORM se reconstruyen de nuevo desde los originales versionados en cada actualización.

## Comandos de diagnóstico

Estado del servicio:

```bash
sudo systemctl status teb --no-pager
```

Logs en tiempo real:

```bash
sudo journalctl -u teb -f
```

Reinicio:

```bash
sudo systemctl restart teb
```

Comprobación de la API:

```bash
curl http://127.0.0.1:8080/api/health
```

Reconstrucción manual de los Micro-SCORM:

```bash
cd /opt/teb
sudo bash scripts/extract-scorms.sh
```

## Estructura pedagógica de UD1

La unidad no se plantea como una actividad breve. Se organiza en 14 bloques: actividad económica y sectores; ciclo económico; inversión/financiación/gasto; gasto/pago e ingreso/cobro; patrimonio; activo/pasivo/patrimonio neto; corriente/no corriente; entrenamiento avanzado; ecuación patrimonial; construcción y clasificación del balance; estructura económica/financiera y ciclo; caso guiado; reto integrador y evaluación/recuperación final.

Los Micro-SCORM reutilizados se insertan dentro de esta progresión como **prácticas formativas de consolidación**, mientras que los bloques largos mantienen explicación, práctica adicional y evidencia. Por tanto, su reutilización no reduce las 14 horas programadas: evita repetir recursos que ya son adecuados y permite dedicar más tiempo a casos, ejercicios y consolidación.

## Control de calidad

GitHub Actions valida automáticamente:

- sintaxis del backend y del JavaScript de TEB;
- reconstrucción correcta de los tres Micro-SCORM;
- integridad ZIP;
- presencia de sus recursos obligatorios;
- sintaxis de `app.js` y `scorm.js` de los paquetes reconstruidos;
- arranque del servidor;
- respuesta satisfactoria de `/api/health`.

## Próximos desarrollos

- Ampliación de la teoría interactiva dentro de cada bloque.
- Más bancos de preguntas y casos aleatorios.
- Reto integrador con documentación simulada de una pyme canaria.
- Recuperación adaptativa específica por criterio.
- Informes docentes ampliados y exportación Aditio.
- Empaquetado completo de la UD1 como SCORM 1.2 cuando interese distribuirla fuera del servidor TEB.
