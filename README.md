# TEB · Técnica Contable

Aplicación didáctica y de seguimiento para el módulo **0441 · Técnica Contable** del CFGM Gestión Administrativa en Canarias.

## Versión actual

La primera versión funcional desarrolla la **UD1 · El patrimonio empresarial en Canarias**, asociada al **RA1**, con una duración programada de **14 horas** y trazabilidad completa de **RA1.a a RA1.g**.

### Criterios cubiertos

- **RA1.a** · Fases del ciclo económico de la actividad empresarial.
- **RA1.b** · Inversión/financiación, inversión/gasto, gasto/pago e ingreso/cobro.
- **RA1.c** · Sectores económicos y tipología de actividades.
- **RA1.d** · Patrimonio, elemento patrimonial y masa patrimonial.
- **RA1.e** · Activo, pasivo exigible y patrimonio neto.
- **RA1.f** · Relación de las masas patrimoniales con el ciclo económico.
- **RA1.g** · Clasificación y ordenación de elementos patrimoniales en masas.

## Funciones implementadas

### Alumnado

- Identificación mediante código TEB y PIN.
- Reanudación desde el último bloque trabajado.
- Itinerario de **14 bloques didácticos** de aproximadamente 55 minutos.
- Explicación, práctica y evidencia en cada bloque.
- Banco autocorregible de preguntas por criterio.
- Registro de intentos, puntuación, tiempo y progreso.
- Mapa visible de dominio de RA1.a–RA1.g.
- Dos recursos patrimoniales reutilizados e integrados dentro de la unidad:
  - práctica básica de clasificación Activo / Pasivo / Patrimonio Neto;
  - entrenamiento avanzado por rondas, con puntuación y dificultad creciente.
- Los recursos integrados comunican sus resultados al servidor TEB y computan en el seguimiento.

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
  - historial de actividades y evidencias.
- Exportación CSV del seguimiento.

## Arquitectura

- `server/server.mjs` · backend Node.js y API REST.
- `server/data/` o `/var/lib/teb` · base SQLite en producción.
- `web/` · interfaz del alumnado y panel docente.
- `web/course.js` · estructura didáctica completa de la UD1.
- `web/reutilizados/` · actividades patrimoniales adaptadas a TEB.
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

1. instala Git, cURL y certificados si faltan;
2. instala Node.js 22 si es necesario;
3. crea el usuario de sistema `teb`;
4. instala o actualiza la aplicación en `/opt/teb`;
5. crea el directorio persistente `/var/lib/teb`;
6. configura el servicio `teb.service`;
7. activa el arranque automático y levanta la aplicación.

Acceso inicial:

```text
http://IP_DEL_SERVIDOR:8080
```

En el primer acceso la aplicación solicitará la creación del administrador.

## Actualización

Vuelve a ejecutar el instalador:

```bash
cd /opt/teb
sudo bash install.sh
```

La base de datos se conserva en `/var/lib/teb`.

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

## Estructura pedagógica de UD1

La unidad no se plantea como una actividad breve. Se organiza en 14 bloques: actividad económica y sectores; ciclo económico; inversión/financiación/gasto; gasto/pago e ingreso/cobro; patrimonio; activo/pasivo/patrimonio neto; corriente/no corriente; entrenamiento avanzado; ecuación patrimonial; construcción del balance; relación patrimonio-ciclo; caso guiado; reto integrador y evaluación/recuperación final.

El objetivo es que el entorno tenga carga real suficiente para acompañar las **14 horas programadas** y que cada actividad produzca evidencias vinculadas a los criterios de evaluación.

## Próximos desarrollos

- Ampliación de teoría interactiva dentro de cada bloque.
- Más bancos de preguntas y casos aleatorios.
- Reto integrador con documentos simulados de una pyme canaria.
- Generación/exportación SCORM 1.2 compatible con Moodle y el LMS propio.
- Modo de recuperación adaptativa por criterio.
- Informes docentes ampliados y exportación Aditio.
