# Registro de cambios — MEDICU CI SaaS

Este documento consolida los cambios técnicos relevantes aplicados al aplicativo, especialmente los relacionados con el despliegue en cPanel, integración con MySQL, persistencia productiva y manejo centralizado de errores.

**Rama de referencia:** `deploy/cpanel`

> Regla de mantenimiento: cada cambio técnico relevante aplicado al sistema debe registrarse aquí con fecha, objetivo, componentes afectados y commit asociado.

---

## 2026-10-01 — Manejo centralizado de errores

### Objetivo
Estandarizar los errores del sistema con una convención única, reutilizable en todos los módulos.

### Convención
Formato obligatorio:

```text
XXXX-YYYY
```

- `XXXX`: dominio o módulo funcional.
- `YYYY`: secuencia numérica única dentro del dominio.

### Dominios definidos
- `AUTH`: Autenticación y acceso
- `PACI`: Pacientes
- `CITA`: Citas
- `TRAT`: Tratamientos
- `AGEN`: Agenda y disponibilidad
- `CONF`: Configuración
- `ADMI`: Administración
- `BBDD`: Base de datos
- `SEGU`: Seguridad
- `SIST`: Sistema / infraestructura

### Cambios aplicados
1. Se creó el catálogo central `api/_lib/catalogo_errores.ts`.
2. Se agregó una fábrica de errores para evitar mensajes y códigos definidos de forma dispersa.
3. La API devuelve, cuando corresponde, un código de negocio junto con el mensaje:
   ```json
   {
     "codigo": "AUTH-0011",
     "error": "El DNI ya está registrado"
   }
   ```
4. Se mantuvieron los códigos HTTP estándar como capa técnica de transporte.
5. Se migraron inicialmente los errores de autenticación, registro y base de datos.

### Commits
- `4bd1018` — Agregar catálogo central de errores XXXX-YYYY
- `13bd224` — Agregar fábrica de errores desde catálogo central
- `1485275` — Responder API con códigos centralizados XXXX-YYYY
- `04b9c68` — Aplicar códigos AUTH y BBDD al flujo de autenticación

---

## 2026-10-01 — Consistencia del registro de pacientes

### Objetivo
Evitar que errores previsibles de negocio terminen como `500 Internal Server Error`.

### Cambios aplicados
1. Validación explícita de correo duplicado antes del alta.
2. Validación explícita de DNI duplicado antes del alta.
3. Traducción de `ER_DUP_ENTRY` de MySQL a conflicto controlado.
4. Validación de:
   - correo;
   - DNI de 8 dígitos;
   - contraseña;
   - nombre;
   - fecha de emisión;
   - fecha futura;
   - antigüedad de fecha.
5. Traducción segura de errores MySQL:
   - duplicidad;
   - integridad referencial;
   - nulos/datos incompatibles;
   - indisponibilidad de conexión.
6. El frontend muestra el error en el campo DNI o correo cuando corresponde.
7. El botón **Crear cuenta** queda temporalmente deshabilitado mientras se procesa el registro para evitar doble envío.
8. Se corrigió la correspondencia entre los códigos de preferencias enviados por la UI y los nombres de especialidad almacenados en la base de datos.

### Commits
- `7205424` — Controlar duplicados y validar consistencia en registro de pacientes
- `5771759` — Traducir errores MySQL a respuestas HTTP seguras
- `e91538d` — Mostrar errores de registro y evitar envíos duplicados

---

## 2026-09-29 — Estabilización de Passenger + Nitro en cPanel

### Objetivo
Lograr que la aplicación Node/TanStack/Nitro funcione de forma estable bajo Apache + Phusion Passenger en cPanel.

### Cambios aplicados
1. Se adaptó Nitro para ejecutarse como middleware compatible con Passenger.
2. Se creó un wrapper CommonJS de arranque para cPanel.
3. Se incluyó el entrypoint de Passenger dentro del artefacto generado.
4. Se corrigió el handshake de Passenger para que el proceso Node quede disponible antes de cargar Nitro.
5. Se agregó captura explícita de errores de solicitudes Nitro en cPanel.
6. Se restauró la URL original después de la reescritura realizada por Apache/Passenger.
7. Se validó el funcionamiento con Node.js 22 en el hosting.
8. Se configuró el log de Passenger como fuente principal de diagnóstico de errores de runtime.

### Archivos relevantes
- `app.cjs`
- `app.js`
- configuración Nitro/Vite
- artefacto `.output`

### Commits
- `451903f` — Build Nitro como middleware para Passenger
- `5a71013` — Adaptar Nitro middleware al socket de Passenger
- `c0066e5` — Empaquetar entrypoint Passenger
- `680b483` — Agregar wrapper CommonJS Passenger
- `e9e7f7f` — Incluir wrapper CommonJS en artefacto
- `8f6551a` — Corregir handshake Passenger antes de Nitro
- `e667c94` — Capturar errores de solicitudes Nitro
- `226b80c` — Restaurar rutas originales después de rewrite de Apache/Passenger

---

## 2026-09-29 — Persistencia productiva y eliminación del fallback local

### Objetivo
Evitar que la aplicación productiva siga guardando o consultando datos locales cuando la API o MySQL no están disponibles.

### Cambios aplicados
1. Se deshabilitó el fallback automático a almacenamiento local en producción.
2. El almacenamiento local quedó reservado únicamente al modo prototipo explícito.
3. Se eliminó la inicialización del store local desde el flujo de login productivo.
4. Se ajustó la ruta raíz para dirigir correctamente al inicio de sesión en servidor.
5. Se documentó la bandera de modo prototipo local.

### Commits
- `10faebb` — Deshabilitar fallback automático local
- `506aa69` — Mantener persistencia local solo en modo prototipo
- `b4c324f` — Documentar bandera explícita de prototipo local
- `be8b090` — Redirigir raíz a login en servidor
- `cd3c699` — Eliminar inicialización local del flujo de login

---

## 2026-09-29 — Diagnóstico del runtime cPanel

### Objetivo
Disponer de una verificación simple del entorno antes de realizar cambios o reinicios.

### Cambios aplicados
1. Se agregó `scripts/diagnostico-cpanel.mjs`.
2. Se agregó el script npm `diagnostico:cpanel`.
3. El diagnóstico permite validar el runtime y dependencias principales antes del despliegue.

### Commits
- `07068ce` — Agregar script de diagnóstico cPanel
- `d1f6653` — Exponer diagnóstico mediante npm

---

## 2026-09-28 — Integración de API y MySQL en servidor Node para cPanel

### Objetivo
Migrar el funcionamiento productivo desde una arquitectura dependiente de Vercel hacia Node.js + Passenger en cPanel, manteniendo MySQL como persistencia.

### Cambios aplicados
1. Se integró la API al servidor Node usado en cPanel.
2. Se consolidó el acceso a MySQL desde el runtime productivo.
3. Se mantuvo la separación frontend → API → MySQL.
4. Se preparó la aplicación para ejecución bajo Passenger.
5. Se mantuvo el manejo de variables de entorno para credenciales y configuración.

### Commit
- `ef6b76a` — Integrar API en servidor Node para cPanel

---

## 2026-09-28 — Build externo para evitar límites de memoria del hosting

### Objetivo
Evitar los errores de memoria de CloudLinux/LVE al compilar directamente dentro del hosting.

### Cambios aplicados
1. Se agregó GitHub Actions para realizar el build en Linux.
2. Se genera un artefacto `medicuci-output.zip`.
3. El artefacto contiene la salida compilada `.output` y los entrypoints necesarios para Passenger.
4. Se ajustó la instalación de dependencias para que el build en CI sea reproducible.
5. Se sincronizó `package-lock.json`.

### Commits
- `7f12334` — Agregar build Linux para cPanel
- `d2429b1` — Sincronizar package-lock
- `9b76abe` — Ajustar instalación de dependencias para build cPanel

### Flujo vigente
```text
Push a deploy/cpanel
        ↓
GitHub Actions
        ↓
Instalación de dependencias
        ↓
Build Linux
        ↓
medicuci-output.zip
        ↓
Carga al hosting
        ↓
Restart Passenger
```

---

## 2026-09-28 — Preparación inicial para cPanel

### Objetivo
Adecuar la aplicación originalmente desplegada con enfoque Vercel para ejecutarse en un hosting cPanel con Node.js.

### Cambios aplicados
1. Preparación de Node.js y MySQL para cPanel.
2. Ajustes en `api/_lib/db.ts`.
3. Ajustes de configuración de Vite/Nitro.
4. Creación del archivo de arranque del aplicativo.
5. Preparación de la rama `deploy/cpanel`.
6. Validación inicial del despliegue local antes de subir al servidor.

### Commits
- `94a71f9` — Base local funcional para despliegue cPanel
- `003743d` — Preparar Node y MySQL para cPanel
- `95c56e9` — Agregar archivo de arranque para cPanel

---

## Estado del mecanismo de despliegue

### Implementado
- Build automático con GitHub Actions.
- Generación de artefacto compilado.
- Compatibilidad con Node.js 22 + Passenger.
- Diagnóstico cPanel.
- Logs Passenger.
- Separación de configuración sensible mediante variables de entorno.

### Pendiente de automatizar
- Transferencia automática del artefacto al hosting.
- Respaldo de la versión anterior.
- Descompresión/despliegue automático.
- Restart automático de Passenger.
- Health check posterior al despliegue.
- Rollback automático en caso de falla.

La alternativa prevista para completar este flujo es **GitHub Actions + SSH hacia cPanel**, siempre que la cuenta de hosting permita acceso SSH externo.

---

## Criterio de actualización de este documento

Registrar aquí cualquier cambio que afecte al menos uno de los siguientes puntos:

- arquitectura;
- base de datos;
- API/backend;
- frontend con impacto funcional;
- autenticación o seguridad;
- manejo de errores;
- persistencia;
- despliegue;
- configuración de cPanel/Passenger;
- automatización CI/CD;
- cambios de infraestructura;
- correcciones que requieran una acción especial de despliegue.

Los ajustes menores puramente visuales pueden quedar documentados únicamente en el historial de commits, salvo que tengan impacto funcional.
