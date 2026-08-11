# Integración MySQL (Aiven) — Medicu CI

Arquitectura implementada: **React → API (`/api/*`, Node en Vercel) → MySQL Aiven**.
El navegador nunca conoce host, usuario, contraseña ni certificados: sólo llama a `/api/...` con su JWT.

## 1. Análisis del diagrama vs. la aplicación (cambios y su justificación)

| Diagrama | Implementado | Motivo |
|---|---|---|
| `PACIENTE.dni int` | `paciente.dni CHAR(8) UNIQUE` | Un DNI puede empezar con 0; `INT` lo perdería. El sistema ya valida 8 dígitos. |
| `PACIENTE.contraseña/correo` | tabla `usuario` (correo, contrasena, rol, estado) + `paciente` 1:1 | Médicos y admin también inician sesión. Centralizar credenciales evita duplicar login y permite JWT con rol. |
| `MEDICO.contraseña/correo` | en `usuario` | Igual que arriba (cuentas `@medicu.ci.com`). |
| `MEDICO.id_disponibilidad (FK)` | eliminado; `disponibilidad.id_medico (FK)` | La relación real es 1 médico → N franjas. El diagrama la tenía invertida. |
| `DISPONIBILIDAD.hora_inicio/hora_fin date` | `TIME` | Son horas, no fechas. |
| `ESPECIALIDAD.id_medico (FK)` | eliminado; `medico.id_especialidad (FK)` | Invertida: una especialidad tiene muchos médicos. |
| `SEDE.id_especialidad (FK)` | eliminado; se deriva de `medico(id_sede, id_especialidad)` | Las especialidades de una sede dependen de los médicos que atienden allí (así funciona hoy el flujo de agendamiento). |
| `CANCELACION.PK id_disponibilidad` | `cancelacion.id_cancelacion` PK + `id_cita` FK | La PK del diagrama era un error: una cancelación pertenece a una cita. |
| `CITA.id_cancelacion (FK)` | eliminado | Se navega `cancelacion.id_cita`; evita FK circular. |
| `CITA.id_estado_cita string` | `cita.id_estado INT FK` | Debe ser el mismo tipo que la PK de `estado_cita`. |
| `CITA` sin especialidad | `cita.id_especialidad FK` | El historial y los reportes por especialidad ya existen en la app. |
| — | `paciente_preferencia` | Preferencias de especialidad del registro (ya existían en el formulario). |
| — | `cita_historial` | Trazabilidad de reprogramaciones/cambios de estado. |
| — | `nota_clinica` | Historia clínica básica ya implementada. |
| — | `notificacion`, `auditoria` | Requeridos por el sistema actual (campana y OWASP A10). |

Estados conservados: **Programada, Reprogramada, Cancelada, Atendida, No asistió**.

## 2. VARIABLES DE ENTORNO PARA VERCEL

| Variable | Obligatoria | Obtener de | Uso | SSL | Entornos |
|---|---|---|---|---|---|
| `DB_HOST` | Sí (si no usa `DATABASE_URL`) | Aiven → Service → Connection information → Host | Host del servicio MySQL | — | Production + Preview |
| `DB_PORT` | Sí (si no usa `DATABASE_URL`) | Aiven → Port | Puerto (normalmente 12xxx) | — | Production + Preview |
| `DB_NAME` | Sí (si no usa `DATABASE_URL`) | Aiven → Database name (`defaultdb`) | Base de datos | — | Production + Preview |
| `DB_USER` | Sí (si no usa `DATABASE_URL`) | Aiven → User (`avnadmin`) | Usuario | — | Production + Preview |
| `DB_PASSWORD` | Sí (si no usa `DATABASE_URL`) | Aiven → Password | Contraseña | — | Production + Preview |
| `DATABASE_URL` | Opcional (sustituye a las 5 anteriores) | Aiven → Service URI | Cadena de conexión completa | — | Production + Preview |
| `DB_SSL_CA` | Recomendada | Aiven → Download CA certificate (`ca.pem`, pegar contenido) | Valida el certificado TLS de Aiven | Sí | Production + Preview |
| `JWT_SECRET` | Sí | Generar (p. ej. `openssl rand -hex 32`) | Firma/validación de los JWT | — | Production + Preview |
| `VITE_URL_API` | No | — | Sólo si la API vive en otro dominio; en Vercel se deja vacía | — | — |

Sin `DB_SSL_CA` la conexión sigue siendo TLS, pero sin verificación estricta de CA.

## 3. Inventario final de la base de datos

Ver `database/esquema_medicu_ci.sql` para el DDL exacto (tipos, NULL, DEFAULT, PK, FK, UNIQUE, índices y `ON DELETE`/`ON UPDATE`).

Tablas: `usuario`, `paciente`, `medico`, `paciente_preferencia`, `sede`, `especialidad`,
`estado_cita`, `disponibilidad`, `cita`, `cancelacion`, `cita_historial`, `nota_clinica`,
`notificacion`, `auditoria`.

Relaciones (origen → destino, ON DELETE / ON UPDATE):

- `paciente.id_usuario` → `usuario.id_usuario` — CASCADE / CASCADE
- `medico.id_usuario` → `usuario.id_usuario` — CASCADE / CASCADE
- `medico.id_especialidad` → `especialidad.id_especialidad` — RESTRICT / CASCADE
- `medico.id_sede` → `sede.id_sede` — RESTRICT / CASCADE
- `paciente_preferencia.id_paciente|id_especialidad` → CASCADE / CASCADE
- `disponibilidad.id_medico` → `medico.id_medico` — CASCADE / CASCADE
- `cita.id_paciente` → `paciente` — CASCADE / CASCADE
- `cita.id_medico|id_especialidad|id_sede|id_estado` → RESTRICT / CASCADE
- `cancelacion.id_cita` → CASCADE; `cancelacion.id_usuario` → SET NULL
- `cita_historial.id_cita` → CASCADE; `.id_usuario` → SET NULL
- `nota_clinica.id_cita|id_medico` → CASCADE / CASCADE
- `notificacion.id_usuario` → CASCADE; `.id_cita` → SET NULL

Restricciones clave:

- `uq_cita_medico_slot (id_medico, fecha, hora)` — impide doble reserva.
- `uq_disp_medico_fecha_hora (id_medico, fecha, hora_inicio)`.
- `uq_usuario_correo`, `uq_paciente_dni`, `uq_medico_codigo`, `uq_sede_nombre`, `uq_especialidad_nombre`.
- `ck_disp_horas CHECK (hora_fin > hora_inicio)`.

## 4. Endpoints implementados

```
GET    /api/salud
POST   /api/auth/registro           POST /api/auth/login
GET    /api/auth/perfil             PUT  /api/auth/perfil
GET    /api/sedes
GET    /api/especialidades?idSede=
GET    /api/medicos?idSede=&idEspecialidad=      GET /api/medicos/:id
GET    /api/disponibilidad?idMedico=[&fecha=|&soloFechas=1|&desde=&hasta=]
POST   /api/disponibilidad          PUT|PATCH /api/disponibilidad/:id     DELETE /api/disponibilidad/:id
GET    /api/citas[?estado=&fecha=]  GET /api/citas/:id   GET /api/citas/:id/historial
POST   /api/citas                   POST /api/citas/:id/notas
PATCH  /api/citas/:id/cancelar      PATCH /api/citas/:id/reprogramar     PATCH /api/citas/:id/estado
DELETE /api/citas/:id
GET    /api/notificaciones          PATCH /api/notificaciones/:id        PATCH /api/notificaciones/todas
GET    /api/auditoria
```

## 5. Pasos manuales

**En Aiven**
1. Ejecutar `database/esquema_medicu_ci.sql` sobre la base existente (es idempotente y no destructivo).
2. Descargar el certificado CA (`ca.pem`) y copiar su contenido a `DB_SSL_CA`.
3. En *Allowed IP addresses*, permitir `0.0.0.0/0` (Vercel no tiene IP fija) o las IPs de su plan.
4. Crear las cuentas institucionales de los médicos (`INSERT` en `usuario` con hash BCrypt + `medico`).

**En Vercel** → Project → Settings → Environment Variables: crear `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD` (o `DATABASE_URL`), `DB_SSL_CA` y `JWT_SECRET` en Production y Preview.

## 6. Limitación importante del entorno de vista previa

La vista previa de Lovable se ejecuta en Cloudflare Workers, que **no admite conexiones TCP a MySQL**.
Por eso la carpeta `api/` está escrita para el runtime Node de Vercel: allí funciona la conexión real
a Aiven. Mientras se trabaja en la vista previa, la app sigue usando el almacenamiento local existente.

## 7. Paso 3 — Conmutación automática de origen de datos (frontend)

Las pantallas ya no eligen entre "local" y "MySQL": lo resuelve la fachada.

- `src/servicios/origen_datos.ts` — consulta `GET /api/salud` una sola vez por
  sesión del navegador y cachea el resultado (`api` | `local`).
- `src/servicios/fachada_datos.ts` — API asíncrona única (`iniciarSesion`,
  `registrarPaciente`, `citasDelPaciente`, `citasDelMedico`, `crearCitaDatos`,
  `cancelar`, `reprogramar`, `fechasLibres`, `horasLibres`). Si hay API, habla
  con MySQL y guarda el JWT emitido por el backend; si no, delega en los
  servicios locales existentes con la misma firma.
- `src/routes/inicio_sesion.tsx` — login y registro ya pasan por la fachada.

Así, desplegado en Vercel con las variables configuradas, la app usa MySQL sin
tocar más código; en la vista previa sigue funcionando con datos locales.

## 8. Paso 4 — Datos iniciales y despliegue

**`database/semillas_medicu_ci.sql`** (ejecutar después del esquema, es idempotente):

1. Estados de cita: Programada, Reprogramada, Cancelada, Atendida, No asistió.
2. Las 5 sedes.
3. Las 8 especialidades utilizadas por el sistema.
4. `admin@medicu.ci.com` (contraseña `Admin2026`, hash BCrypt ya incluido).
5. Las 14 cuentas institucionales `@medicu.ci.com` (contraseña `Medicu2026`)
   con su médico, especialidad y sede.
6. Disponibilidad de ejemplo: 08:00–13:00 en bloques de 30 min, 21 días, sin domingos.

> Cambie las contraseñas sembradas antes de usar el sistema en producción.

**`vercel.json`** fija el runtime Node para `api/[...ruta].ts`, el build de Vite
y cabeceras de seguridad (`no-store`, `nosniff`, `no-referrer`) para `/api/*`.

**Orden de despliegue**
1. Aiven: ejecutar `database/esquema_medicu_ci.sql` y luego `database/semillas_medicu_ci.sql`.
2. Vercel: crear las variables de entorno de la sección 2 (Production y Preview).
3. Desplegar y verificar `https://<dominio>/api/salud` → `{"ok":true}`.
4. Entrar con una cuenta sembrada; la app detectará la API y usará MySQL.

## 9. Pasos 5, 6 y 7 — Migración completa de pantallas a la fachada

**Paso 5 — Paciente**
- `src/routes/panel_principal.tsx`: carga de próximas citas, catálogos (sedes,
  especialidades, médicos) y creación de la cita mediante
  `citasDelPaciente`, `sedesDatos`, `especialidadesDeSedeDatos`, `medicosDatos`
  y `crearCitaDatos`. Con API activa envía `idMedico`, `idSede` e
  `idEspecialidad` reales de MySQL.
- `src/routes/historial_citas.tsx`: historial vía `citasDelPaciente`.

**Paso 6 — Acciones sobre la cita y agenda**
- `src/components/Detalle_Cita.tsx`: cancelar y reprogramar pasan por
  `cancelar` / `reprogramar` de la fachada, con el actor de sesión.
- `src/components/Selector_Fecha_Hora.tsx`: fechas y horas se piden con
  `fechasLibres` / `horasLibres` (asíncrono, con estado de carga).

**Paso 7 — Médico**
- `src/routes/panel_medico.tsx`: agenda propia con `citasDelMedico` y
  cancelación individual o masiva con `cancelar` (motivo obligatorio).

**Nuevas funciones de la fachada** (`src/servicios/fachada_datos.ts`):
`actorActual()`, `sedesDatos()`, `especialidadesDeSedeDatos()`, `medicosDatos()`.
Todas caen automáticamente al almacén local si `/api/salud` no responde, por lo
que la vista previa sigue funcionando sin MySQL.
