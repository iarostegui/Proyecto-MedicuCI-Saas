# MEDICU CI SaaS — Módulo de citas médicas (despliegue cPanel)

> **Rama:** `deploy/cpanel` · **Destino:** hosting con cPanel, Node.js 22 y Apache/Phusion Passenger.  
> Esta rama contiene las adaptaciones de despliegue. La rama `main` es independiente y no debe sustituirse ni mezclarse automáticamente.

## 1. Objetivo y alcance

MEDICU CI SaaS gestiona citas médicas, pacientes, médicos, sedes, especialidades, disponibilidad y procesos asociados. Este README describe **cómo se adaptó la aplicación inicialmente preparada para Vercel** para ejecutarse en un hosting con Node.js y cPanel, cómo compilarla y cómo desplegarla.

La migración **no consistió en reescribir todo el backend**. Se reutilizaron los servicios y rutas existentes, integrando la API en el servidor Node/Nitro y agregando una entrada compatible con Passenger.

**Estado comprobado en el código:** hay un build automatizado en GitHub Actions y un paquete descargable. **No hay despliegue automático completo al hosting**: la subida, configuración y reinicio siguen siendo manuales. La documentación de esta rama no demuestra por sí sola que el hosting actualmente instalado sea idéntico al último commit.

## 2. Arquitectura

| Capa | Tecnología / componente | Papel |
| --- | --- | --- |
| Frontend | React, TanStack Router/Start, Tailwind CSS, Vite | Interfaz, navegación y formularios |
| Aplicación web/SSR | TanStack Start + Nitro | Renderización, rutas y middleware |
| Backend/API | `api/index.ts`, `api/servicios/*`, puente en `src/server.ts` | Operaciones HTTP `/api/*` |
| Acceso a datos | `api/_lib/db.ts` + `mysql2/promise` | Pool MySQL y consultas parametrizadas |
| Base de datos | MySQL | Datos persistentes del módulo |
| Alojamiento | cPanel + Apache/Phusion Passenger + Node.js 22 | Ejecuta el servidor en el hosting |
| Compilación | GitHub Actions / Linux | Genera el paquete previo a la instalación |

Flujo general:

```text
Navegador
  → Apache (hosting cPanel)
  → Phusion Passenger / Node.js 22
  → app.cjs (arranque)
  → .output/server/index.mjs (middleware Nitro)
      ├─ Rutas web / TanStack Start
      └─ /api/* → src/server.ts → api/index.ts → api/servicios/*
                                           → api/_lib/db.ts → MySQL
```

## 3. Qué cambió respecto de Vercel

| Antes (enfoque Vercel) | Adaptación para Node.js/cPanel |
| --- | --- |
| La API se desplegaba mediante funciones compatibles con Vercel | `src/server.ts` deriva `/api/*` al handler ya existente `api/index.ts` |
| Configuración de build orientada al proveedor | `vite.config.ts` usa Nitro `preset: "node_middleware"` y `tanstackStart.server.entry: "server"` |
| Arranque administrado por la plataforma | `app.cjs` crea el servidor HTTP y carga el middleware Nitro, compatible con Passenger |
| Build/despliegue en la plataforma original | GitHub Actions compila en Linux y publica el artefacto `medicuci-output` |
| Variables de entorno en Vercel | Variables definidas en cPanel/entorno Node |
| Diagnóstico disperso | Se incluye `scripts/diagnostico-cpanel.mjs` y registro de cambios |

Detalles adicionales:
- `app.cjs` restaura las rutas recibidas mediante el parámetro `__route` cuando Apache/Passenger ha realizado una reescritura.
- `app.js` es una alternativa ESM de arranque, mientras que `app.cjs` es el wrapper registrado para la adaptación a Passenger; **no configurar los dos como arranque simultáneamente**.
- En producción, el acceso a datos utiliza la API. El fallback automático al almacenamiento local de demostración se desactivó.
- Se agregó catálogo centralizado de errores en `api/_lib/catalogo_errores.ts` y ajustes para registro/duplicidad de pacientes.
- Las referencias a tipos `@vercel/node` que todavía aparecen en la API son compatibilidad a nivel de código; no significan que la rama cPanel necesite desplegarse en Vercel.

Para fechas, decisiones y commits de cada cambio, consultar [Registro de cambios](docs/REGISTRO_CAMBIOS.md).

## 4. Archivos importantes

| Archivo / directorio | Función |
| --- | --- |
| `app.cjs` | Wrapper HTTP CommonJS para Passenger; carga `.output/server/index.mjs` |
| `app.js` | Entrada HTTP alternativa ESM |
| `vite.config.ts` | Configuración de Nitro como middleware Node |
| `src/server.ts` | Integra las solicitudes API en la ejecución del servidor |
| `api/index.ts` | Router central de la API |
| `api/_lib/db.ts` | Conexión y pool MySQL |
| `api/_lib/catalogo_errores.ts` | Catálogo central de errores de aplicación |
| `src/servicios/origen_datos.ts` | Política de uso de API vs. prototipo local |
| `.github/workflows/build-cpanel.yml` | Compilación y artefacto en GitHub Actions |
| `scripts/diagnostico-cpanel.mjs` | Revisión del runtime, archivos, variables y MySQL |
| `.env.example` | Ejemplo de variables, **sin credenciales** |
| `docs/REGISTRO_CAMBIOS.md` | Histórico de cambios y estado del despliegue |

## 5. Requisitos

- Acceso al repositorio y a GitHub Actions.
- cPanel con **Setup Node.js App** o funcionalidad equivalente compatible con **Node.js 22 y Passenger**.
- Base MySQL configurada, con esquema/tablas y permisos adecuados.
- Variables de entorno del servidor (consultar siguiente sección).
- Una aplicación Node configurada en cPanel con su raíz, URL y startup file correctos.
- Posibilidad de cargar y extraer archivos con el **Administrador de archivos** de cPanel; los pasos no requieren terminal en el hosting.

**Atención:** el ZIP producido por el workflow incluye `.output`, `app.js` y `app.cjs`, **no** incluye `package.json` ni `node_modules`. Antes de actualizar una instalación nueva se debe validar que el runtime tenga disponibles las dependencias necesarias y que el artefacto compilado funcione en ese hosting. No asumir que el ZIP por sí solo constituye una instalación completamente autónoma.

## 6. Configuración de entorno

Definir en cPanel las variables secretas **sin subir valores reales a GitHub**.

| Variable | Uso |
| --- | --- |
| `DB_HOST` | Host de MySQL (si no se utiliza `DATABASE_URL`) |
| `DB_PORT` | Puerto, normalmente `3306` |
| `DB_NAME` | Base de datos |
| `DB_USER` | Usuario MySQL |
| `DB_PASSWORD` | Contraseña MySQL |
| `DATABASE_URL` | Alternativa de conexión URI MySQL |
| `DB_SSL` | `true` si se requiere TLS; en otro caso `false` o no definida |
| `DB_SSL_CA` | Certificado CA en texto para validación TLS cuando corresponda |
| `JWT_SECRET` | Secreto robusto para tokens de sesión |
| `NODE_ENV` | `production` en producción |
| `PORT` | Puerto/socket de escucha asignado por el entorno; no fijarlo arbitrariamente si Passenger lo gestiona |
| `VITE_URL_API` | Base alternativa de API, solo si se necesita otro origen |
| `VITE_MODO_PROTOTIPO_LOCAL` | Debe estar en `false` para producción |

**Distinción importante:** las variables `VITE_*` se incorporan al frontend **durante el build**. Configurarlas o cambiarlas solo después de compilar no garantiza que se actualice el comportamiento del navegador. Si se alteran, regenerar el build con los valores correspondientes.

El archivo `.env.example` conserva comentarios históricos sobre Vercel/Aiven; tomar como referencia para cPanel las variables efectivamente leídas por `api/_lib/db.ts` y el presente README. En particular, `DB_SSL` determina en el código actual si se activa TLS. No guardar `.env`, claves privadas, tokens ni respaldos sensibles en el repositorio.

## 7. Generar el paquete desde GitHub

El workflow real es [Build cPanel](.github/workflows/build-cpanel.yml):

1. Abrir el repositorio en GitHub y seleccionar la rama **`deploy/cpanel`**.
2. Entrar a **Actions → Build cPanel**.
3. Seleccionar **Run workflow**, indicando `deploy/cpanel` cuando GitHub permita ejecutar manualmente desde esa rama. También se ejecuta automáticamente al hacer push a la rama.
4. Abrir la ejecución completada correctamente y descargar el artefacto denominado **`medicuci-output`**.
5. Si GitHub entrega un ZIP envolvente, extraerlo para obtener **`medicuci-output.zip`**, que contiene `.output/`, `app.js` y `app.cjs`.

La acción usa **Node.js 22**, ejecuta `npm install`, `npm run build` y empaqueta:

```text
medicuci-output.zip
├── .output/
│   ├── server/
│   │   └── index.mjs
│   └── public/
├── app.js
└── app.cjs
```

La carpeta `.output` es un resultado de compilación; está excluida de Git mediante `.gitignore`. **Para distribuir los fuentes**, compartir la rama `deploy/cpanel`; **para instalar el runtime compilado**, usar el artefacto.

- [Fuentes de la rama](https://github.com/iarostegui/Proyecto-MedicuCI-Saas/tree/deploy/cpanel)
- [Historial de ejecuciones](https://github.com/iarostegui/Proyecto-MedicuCI-Saas/actions/workflows/build-cpanel.yml)

## 8. Instalar/actualizar en cPanel (sin terminal)

> La ruta física y el dominio son **propios de cada hosting**; no se establecen valores fijos en este repositorio.

1. **Respaldo.** Guardar fuera de la carpeta publicada una copia del build que actualmente funciona y registrar qué versión/commit se va a instalar. Realizar backup de MySQL antes de cambios de esquema.
2. **Build.** Generar o descargar el artefacto desde la ejecución correcta de GitHub Actions de `deploy/cpanel`.
3. **App Node en cPanel.** En **Setup Node.js App**, confirmar Node.js 22, el directorio raíz configurado para la app, el dominio/ruta de aplicación, el modo Production y el startup file **`app.cjs`** correspondiente a la configuración que se validó para Passenger.
4. **Dependencias.** Verificar que los módulos requeridos por el build estén disponibles en la instalación del hosting. Para una instalación desde cero, preparar las dependencias y su configuración antes de intentar iniciar el ZIP; no asumir que el archivo empaquetado incluye `node_modules`.
5. **Variables.** Confirmar variables de conexión a MySQL, JWT y las demás aplicables en la configuración de cPanel.
6. **Subida.** En **File Manager**, subir el ZIP a la raíz de la aplicación Node configurada y extraerlo allí, conservando la estructura: `.output/server/index.mjs`, `.output/public`, `app.cjs` y `app.js`.
7. **Rutas/rewrite.** Conservar la configuración Apache/Passenger ya validada en el hosting, incluida cualquier reescritura de URL necesaria. El wrapper entiende el parámetro `__route`, pero esta rama no constituye por sí sola un respaldo de la configuración Apache del servidor.
8. **Reinicio.** Reiniciar la aplicación desde **Setup Node.js App → Restart** (o la acción equivalente del proveedor).
9. **Pruebas.** Realizar las validaciones de la siguiente sección. Ante error, volver a la versión respaldada y revisar logs antes de continuar.

**No borrar archivos de configuración del proveedor ni reemplazar el directorio completo de la aplicación por el ZIP sin inspección previa.** En particular, preservar la configuración del entorno, el enlace de dependencias, las reglas Apache y cualquier archivo de arranque administrativo que cPanel requiera.

### Ejecución local (si se necesita validar)

```bash
npm install
npm run build
node app.cjs
```

En desarrollo:

```bash
npm run dev
```

La ejecución local de producción requiere variables MySQL/JWT válidas. `app.cjs` escucha en `PORT` o, en ausencia de esta variable, en el puerto `3000`.

## 9. Validación funcional y diagnóstico

Tras un despliegue, comprobar como mínimo:

1. **Aplicación web:** abre la URL del hosting y el login se muestra correctamente.
2. **API básica:** `GET https://DOMINIO/api/salud` devuelve una respuesta `ok` sin acceso a MySQL.
3. **Conexión DB:** `GET https://DOMINIO/api/salud?db=1` ejecuta el diagnóstico de la base. Restringir su uso/exposición cuando sea pertinente en producción.
4. **Flujos de negocio:** registrar un usuario de prueba, iniciar sesión, consultar sedes/especialidades/médicos, revisar disponibilidad y crear una cita de prueba. Verificar **persistencia real en MySQL** y no en almacenamiento local.
5. **Consistencia:** probar correo/DNI duplicados y comprobar respuesta controlada en UI/API.
6. **Operaciones de citas:** validar consulta, cancelación y reprogramación de acuerdo con los requisitos funcionales implementados; no asumir que todas las casuísticas pendientes están terminadas.
7. **Logs:** ante respuesta HTTP 500, revisar errores del runtime Node/Passenger.

El proyecto incluye el comando:

```bash
npm run diagnostico:cpanel
```

Este comando revisa versión de Node, archivos del build, variables (sin imprimir contraseñas), `mysql2` y conexión MySQL. **Requiere entorno capaz de ejecutar npm/Node y dependencias instaladas; no es ejecutable desde File Manager por sí solo.**

Si **no hay terminal en el hosting**, usar File Manager, Setup Node.js App, variables de entorno y los logs que exponga cPanel/Passenger, además de las pruebas HTTP anteriores. No publicar un endpoint de diagnóstico administrativo sin autenticación.

## 10. Errores y trazabilidad

La codificación interna sigue el formato **`XXXX-YYYY`**, donde `XXXX` identifica el dominio (por ejemplo `AUTH`, `CITA`, `BBDD` o `SIST`) y `YYYY` es una secuencia propia de ese dominio. Los códigos de negocio complementan, **no sustituyen**, los HTTP estándar.

- Definiciones: `api/_lib/catalogo_errores.ts`.
- Cambios funcionales/técnicos: `docs/REGISTRO_CAMBIOS.md`.
- Para futuras modificaciones: documentar fecha, objetivo, componentes afectados, impacto en hosting/base de datos y commit.

## 11. Qué está automatizado y qué falta

**Implementado:** construcción automática en GitHub Actions, empaquetado de `.output` y entrypoints, descargas del artefacto, adaptación Node/Passenger y script de diagnóstico.

**Aún pendiente:** transferencia automática al hosting, respaldo automático, extracción/publicación, reinicio, prueba de salud posdespliegue y rollback. No interpretar que un push a `deploy/cpanel` publica automáticamente la app del hosting.

La automatización futura podría realizarse mediante GitHub Actions y un canal autorizado al hosting, como SSH/SFTP **solo si el proveedor lo permite**, con credenciales almacenadas en GitHub Secrets. Hasta entonces se mantiene el despliegue manual.

## 12. Recomendaciones de mantenimiento

- Trabajar los cambios dirigidos a cPanel en `deploy/cpanel`, evitando alterar `main` sin revisión.
- Antes de distribuir una versión, identificar **commit fuente**, **ejecución de Actions**, **artefacto utilizado** y **versión instalada en hosting**.
- No incluir secretos en commits, README, capturas o paquetes públicos.
- Mantener `VITE_MODO_PROTOTIPO_LOCAL=false` en builds productivos.
- Verificar respaldos y continuidad de servicio antes de cada actualización.
- Actualizar este README si cambian el startup file, el workflow, los requisitos de Node o los pasos de publicación.

---

**Referencia detallada:** [Registro de cambios de MEDICU CI SaaS](docs/REGISTRO_CAMBIOS.md).
