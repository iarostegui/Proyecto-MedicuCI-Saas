
# Plan por fases — Medicu CI

Todo el estado (usuarios, médicos seed, citas, disponibilidad, cancelaciones) vivirá en **LocalStorage** bajo el prefijo `medicu:`. Se mantiene TanStack Start + TypeScript (`.tsx`). URLs y nombres internos pasan a español con `guion_bajo`.

---

## Convenciones globales (aplican a las 3 fases)

- Archivos de rutas: `src/routes/inicio_sesion.tsx`, `panel_principal.tsx`, `historial_citas.tsx`, `solicitud_citas.tsx`, `panel_medico.tsx`, `disponibilidad_medico.tsx`.
- Componentes: `Tarjeta_Cita.tsx`, `Insignia_Estado.tsx`, `Boton_Urgente.tsx`, `Cascara_App.tsx`, etc.
- Lógica/datos en español bajo `src/logica/` (auth, citas, medicos, disponibilidad, cancelaciones) y `src/datos/` (seeds: sedes, especialidades, médicos iniciales).
- Clases/IDs CSS custom en español con `_` (los utilitarios de Tailwind se mantienen; la regla aplica a nombres propios).
- Sin diseño nuevo: se conserva la paleta clínica y componentes existentes.

---

## Fase 1 — Refactor + Auth con nombre y roles (entregable base)

**Objetivos cubiertos:** 1, 2, 8 (parcial), 10.

1. **Renombrar toda la estructura** a español con `_`:
   - Rutas → nuevas URLs `/inicio_sesion` (raíz redirige aquí), `/panel_principal`, `/historial_citas`, `/solicitud_citas`, `/panel_medico`, `/disponibilidad_medico`.
   - Mover `src/lib/auth.ts` → `src/logica/autenticacion.ts`, `src/lib/appointments.ts` → `src/logica/citas.ts`.
   - Renombrar componentes (`AppShell` → `Cascara_App`, `StatusBadge` → `Insignia_Estado`, `UrgentFab` → `Boton_Urgente`).
   - Actualizar todos los `import`, `createFileRoute(...)` y `Link to=...`.
2. **Modelo de usuario** amplía `StoredUser` con `nombre`, `rol: 'Paciente' | 'Medico'`, `sede?`, `especialidad?`.
3. **Registro (solo pacientes):**
   - Fuerza `rol = 'Paciente'`.
   - Bloquea correos `@medicu.ci.com` con mensaje: *"Las cuentas institucionales solo pueden ser creadas por un administrador."*
   - Bloquea correos existentes en el seed de médicos con mensaje: *"Esta cuenta pertenece al personal médico del hospital."*
4. **Seed de médicos** en `src/datos/medicos_iniciales.ts` (jimmy/mirella/andres/hector/david con nombre, especialidad, sede, contraseña, rol Médico). Se carga en LocalStorage la primera vez.
5. **Inicio de sesión:**
   - Valida contra usuarios + médicos seed.
   - Correos `@medicu.ci.com` inexistentes → *"Credenciales inválidas"*.
   - Guarda sesión (`email`, `nombre`, `rol`) en LocalStorage.
   - Redirige: Médico → `/panel_medico`; Paciente → `/panel_principal`.
6. **Panel** muestra saludo con el `nombre` real de sesión.
7. **Hook `useSesion()`** central que expone `{ usuario, rol, cerrarSesion }` para toda la app.

**Verificación fase 1:** build limpio, login/registro con validaciones, redirecciones por rol, saludo con nombre.

---

## Fase 2 — Gestión y agendamiento de citas del paciente

**Objetivos cubiertos:** 3, 4, parte de 9.

1. **Modelo `Cita`** en LocalStorage: `codigo` (auto ej. `CI-2026-00042`), `pacienteEmail`, `doctorId`, `especialidad`, `sede`, `fecha`, `hora`, `estado` (Programada/Reprogramada/Cancelada/Atendida), `fechaCreacion`, `observaciones?`, `motivoCancelacion?`.
2. **Flujo `/solicitud_citas`** con stepper de 5 pasos:
   1. Sede (Lima, San Borja, Mediocentro San Isidro, Surco El Polo, La Molina).
   2. Especialidad (según ya existentes).
   3. Doctor (filtrado por especialidad + sede, desde seed).
   4. Fecha (solo días habilitados por la disponibilidad del médico — leído del store creado en fase 3; en fase 2 se usa un stub por médico).
   5. Hora (solo slots libres; se excluyen los ya reservados).
   - Resumen antes de confirmar (doctor, especialidad, sede, fecha, hora) → botón "Confirmar".
3. **Historial `/historial_citas`:** lista/tarjetas por cita con acciones:
   - Ver detalles (modal con todos los campos del Objetivo 3).
   - Cancelar (cambia estado, libera slot).
   - Descargar comprobante PDF (usando `jspdf` — se instalará).
   - Insignia de estado con color.
4. **Panel principal:** botón "Agendar cita" → `/solicitud_citas`; próximas citas agrupadas por fecha; FAB urgente ya existente se mantiene y crea cita con prioridad urgente.

**Verificación fase 2:** flujo end-to-end de reservar, ver, cancelar y descargar PDF; slots ocupados no reaparecen.

---

## Fase 3 — Panel médico, disponibilidad y cancelación masiva

**Objetivos cubiertos:** 5, 6, 7, cierre de 8 y 9.

1. **Disponibilidad del médico** (`/disponibilidad_medico`): registrar días de atención, fechas puntuales, rango de horas, duración de consulta (minutos). Guardado en `medicu:disponibilidad:{doctorId}`. Los slots del paciente se generan dinámicamente desde aquí.
2. **Panel médico** (`/panel_medico`):
   - Tabla/tarjetas de todas las citas asignadas al médico logueado.
   - Filtros: fecha (rango), sede, estado.
   - Buscador por nombre/DNI de paciente.
   - Ver detalles completos.
3. **Cancelación por el médico:**
   - Checkboxes en cada fila + "Seleccionar todas".
   - Botón "Cancelar seleccionadas" → modal con motivo obligatorio (Emergencia médica / Ausencia del médico / Reprogramación institucional / Otro con texto libre).
   - Al confirmar: `estado = 'Cancelada'`, guarda `motivoCancelacion`, libera slots.
4. **Restricción de acceso** por rol en rutas: `beforeLoad` sencillo leyendo sesión de LocalStorage; pacientes no ven rutas médicas y viceversa.
5. **Arquitectura de datos preparada para admin futuro:** todas las operaciones de médicos pasan por `src/logica/medicos.ts` (funciones `listarMedicos`, `crearMedico`, `actualizarMedico`) — así un futuro panel admin solo consume esa capa sin tocar UI.

**Verificación fase 3:** médico ve solo sus citas, filtros funcionan, cancelación múltiple libera horarios y quedan visibles para nuevos pacientes; paciente no puede entrar a rutas médicas.

---

## Detalles técnicos

- **Nueva dependencia:** `jspdf` (comprobante PDF) — se instala al iniciar fase 2.
- **Sin backend:** todo bajo claves `medicu:usuarios`, `medicu:sesion`, `medicu:citas`, `medicu:disponibilidad:{id}`, `medicu:medicos` (sembrado en primer arranque via efecto en `__root.tsx`).
- **Compatibilidad:** se conservan los datos actuales migrando la clave `medicu:users` → `medicu:usuarios` con un pequeño migrador idempotente.
- **Sin cambios visuales**: se reutilizan `Cascara_App`, `Insignia_Estado`, `Boton_Urgente`, colores y tipografía actuales.
- **Verificación al final de cada fase:** compilación sin errores, imports resueltos, rutas navegables, features previas intactas.

---

## Entrega

Empiezo por la **Fase 1** al aprobar este plan. Fases 2 y 3 se ejecutan como iteraciones separadas para poder validar cada bloque antes de avanzar.
