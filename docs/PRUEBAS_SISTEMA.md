# Operación y pruebas del sistema

Guía única para que cualquier persona entienda cómo levantar AZENDA, probarla por roles, mantenerla día a día y resolver fallos sin adivinar cada comando.

---

## Cómo usar este documento

| Sección | Para qué sirve |
| --- | --- |
| [1 Despliegue local](#1-despliegue-local-neon) | Primera instalación y arranque diario |
| [2 Correos de prueba](#2-correos-de-prueba-por-rol) | Usuarios y contraseñas de demo |
| [3 Plan de pruebas](#3-plan-de-pruebas-funcionales) | Qué probar y en qué orden |
| [4 Regresión](#4-regresión-corta-checklist) | Lista corta antes de entregar |
| [5 Mantenimiento operativo](#5-mantenimiento-operativo-detallado) | **Qué hace cada comando** y cuándo ejecutarlo |
| [6 Runbook de errores](#6-corrección-de-errores-runbook) | Síntomas → causas probables → pasos de arreglo |
| [7 Criterio de salida](#7-criterio-de-salida) | Cuándo considerar el sistema “listo” |

Documentos relacionados: [BACKEND.md](BACKEND.md), [PLANES_Y_FACTURACION.md](PLANES_Y_FACTURACION.md), [DESPLIEGUE_PRUEBA_NGROK.md](DESPLIEGUE_PRUEBA_NGROK.md).

---

## 1) Despliegue local (Neon)

### Qué es esto

Ejecutar la **web (Angular)** y el **API (NestJS)** en tu PC, con datos reales en **Neon** (PostgreSQL en la nube). No hace falta instalar Postgres en la máquina.

### Requisitos

| Requisito | Para qué sirve |
| --- | --- |
| **Node.js + npm** instalados | Ejecutar Angular y Nest |
| Una **base Neon** creada | Donde viven tablas y usuarios |
| Archivo **`api/.env`** con `DATABASE_URL` | El API usa solo esa variable para conectar a Neon |

### Archivo de entorno (`api/.env`)

| Variable | Qué hace | Obligatorio |
| --- | --- | --- |
| `DATABASE_URL` | Cadena de conexión Postgres (Neon). El API **solo** usa esto para la base; si falta o está mal, el API no arranca o falla al consultar. | Sí |

Ejemplo de línea (copia desde el panel Neon; la línea no debe llevar `#` delante):

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require

```

Opcional (solo si el equipo lo acordó):

| Variable | Qué hace |
| --- | --- |
| `PORT` | Puerto del API (por defecto suele ser 3000 según proyecto). |
| `DB_BOOTSTRAP_ON_START` | Si vale `1`/`true`, al **cada arranque** del API ejecuta bootstrap (esquema + semilla si hace falta). Útil en entornos controlados; en local suele bastar con `db:bootstrap` manual. |

### Comandos de primer arranque (desde la raíz del repo)

| Orden | Comando | Qué hace exactamente |
| --- | --- | --- |
| 1 | `npm install` | Descarga dependencias del **frontend** (carpeta raíz `package.json`). Sin esto Angular no arranca. |
| 2 | `npm install` dentro de API (solo si falta): `npm --prefix api install` | Dependencias del **backend** Nest. Suele ejecutarse antes del primer bootstrap si `api/node_modules` no existe. |
| 3 | `npm run db:bootstrap` | Llama al script de bootstrap del API: crea/actualiza **tablas** en Neon y, si no hay usuarios, inserta **usuarios y tenants demo**. Ver [mantenimiento](#npm-run-dbbootstrap). |
| 4 | `npm run dev` | Arranca **a la vez** el API (`nest start --watch`) y el servidor de desarrollo de Angular (`ng serve`). Solo para desarrollo local. |

Tras arrancar, abre:

- Web: `http://localhost:4200`
- API: `http://localhost:3000` (salvo otro puerto configurado)

---

## 2) Correos de prueba por rol

Estos usuarios los crea el **seed** del backend la primera vez que la base está **vacía** (sin usuarios). La contraseña es la misma para todos los seed en código.

| Rol en sistema | Correo | Contraseña | Qué esperar al entrar |
| --- | --- | --- | --- |
| SUPER_ADMIN | `super@azenda.dev` | `azenda123` | Panel super admin (`/super`), vista global |
| ADMIN (tenant Spa) | `admin-spa@azenda.dev` | `azenda1234` | Panel del negocio (`/app`) asociado a Spa |
| ADMIN (tenant Clínica) | `admin-clinica@azenda.dev` | `azenda123` | Panel del negocio; el tenant puede estar con restricciones según estado en BD |
| EMPLEADO | `empleado@azenda.dev` | `azenda123` | Panel operativo (`/app`) con permisos de empleado |

**Importante:** si ya tienes datos en Neon y el seed no se vuelve a ejecutar, estos correos pueden no existir hasta que repitas bootstrap en condiciones adecuadas (ver [db:bootstrap](#npm-run-dbbootstrap)).

### Slugs públicos de reserva (referencia)

Tras seed típico puedes probar reservas en `/reservar/<slug>`, por ejemplo slugs como `spa-relax`, `barberia-centro`, `clinica-demo` según lo que haya en tu base. Si un slug no existe, la pantalla pública lo indicará.

---

## 3) Plan de pruebas funcionales

Cada bloque indica **qué comprobar** y **por qué importa**.

### A. Acceso y sesión

- Ir a `/login`.
- Iniciar sesión con cada rol de la tabla anterior.
- **Resultado esperado:** redirección coherente (`/super` para super admin, `/app` para tenant).
- Cerrar sesión y volver a entrar: **no** debe quedar sesión “fantasma” en la UI.

### B. SUPER_ADMIN

- Ir a `/super`.
- Revisar listado de tenants y navegación.
- **Resultado esperado:** sin errores de red grave; cambios que la UI permita deben reflejarse tras recargar si aplica.

### C. ADMIN de tenant

- Ir a `/app`.
- Citas: listar, crear manual si está habilitado, cambiar asistencia.
- Facturación: ver estado de ciclo y simulación de upgrade si la pantalla lo expone.
- **Resultado esperado:** datos persisten en Neon (recarga y sigue ahí).

### D. EMPLEADO

- Ir a `/app`.
- **Resultado esperado:** acciones acotadas al rol; no acceso a `/super`.

### E. Flujo público

- Abrir `/reservar/<slug>` con un slug válido.
- Crear reserva.
- Con un usuario ADMIN del mismo negocio, confirmar en `/app` que la cita aparece.

---

## 4) Regresión corta (checklist)

Antes de una demo o merge a rama principal, marcar:

- [ ] Consola del navegador sin errores rojos bloqueantes.
- [ ] Red: sin tormenta de `500` en las rutas que usas en la demo.
- [ ] Tras recargar, los datos creados en la prueba siguen en Neon.
- [ ] Rutas: `/`, `/login`, `/app`, `/super`, `/reservar/<slug>` abren sin pantalla en blanco.

---

## 5) Mantenimiento operativo (detallado)

Aquí cada comando explica **qué toca**, **cuándo usarlo** y **qué puede salir mal**.

### Dónde se ejecutan

- **Raíz del repo** (`AZENDA/`): comandos del frontend y los que delegan al API (`npm run dev`, `npm run db:bootstrap`, `npm run build`).
- **Carpeta `api/`**: comandos solo del backend (`npm --prefix api run …`).

---

### `npm install` (raíz)

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Instala dependencias del proyecto Angular y herramientas definidas en el `package.json` de la raíz. |
| **Cuándo** | Clon nuevo del repo, cambio de rama con dependencias distintas, o si falla `ng` por módulos faltantes. |
| **Qué no hace** | No instala dependencias del API; para eso ver siguiente fila. |

---

### `npm --prefix api install`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Instala dependencias de Nest (`api/package.json`) en `api/node_modules`. |
| **Cuándo** | Primera vez con el backend, o tras borrar `api/node_modules`. |
| **Qué no hace** | No crea tablas ni usuarios en Neon; eso es `db:bootstrap`. |

---

### `npm run dev`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Lanza dos procesos en paralelo: **API Nest en modo watch** y **`ng serve`** (Angular). Cambias código y ambos intentan recargar. |
| **Cuándo** | Trabajo diario de desarrollo. |
| **Requisitos** | `DATABASE_URL` correcta en `api/.env` y normalmente bootstrap ya ejecutado al menos una vez. |
| **Cómo detenerlo** | `Ctrl+C` en la terminal (para ambos procesos gestionados por `concurrently`). |

---

### `npm run start:api`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Arranca **solo** el backend (`nest start --watch`). |
| **Cuándo** | Quieres el API sin levantar Angular (por ejemplo otro proceso ya sirve el front). |

---

### `npm run start` o `npm run start:web`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Arranca **solo** Angular (`ng serve`). El API debe estar ya corriendo por separado si la app necesita datos. |
| **Cuándo** | Depuración solo de UI o consumes el API apuntando a otro servidor. |

---

### `npm run db:bootstrap`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Ejecuta el script de bootstrap del API contra Neon: garantiza **esquema** (tablas, columnas esperadas según código) y corre la **semilla solo si la tabla `users` está vacía** (primer uso). Si ya hay usuarios, suele solo asegurar migraciones/schema sin sobrescribir datos. |
| **Cuándo** | Nueva base Neon, error de “tabla no existe”, entorno fresco, o después de cambios grandes de esquema en el código que el bootstrap debe aplicar. |
| **Ojo** | No sustituye backups ni migraciones formales de producción; en producción el equipo debe definir estrategia aparte. |
| **Si falla** | Revisar `DATABASE_URL`, firewall, y que Neon acepte conexiones SSL. Ver [runbook](#6-corrección-de-errores-runbook). |

---

### `npm run db:setup`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | En el estado actual del repo equivale a `npm run db:bootstrap` (alias simplificado). |
| **Cuándo** | Si alguien del equipo documentó “setup de BD” con ese nombre. |

---

### `npm --prefix api run build`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Compila TypeScript del API a `api/dist/`. Es el equivalente a “build de producción” del backend. |
| **Cuándo** | Antes de desplegar el API, o para verificar que el código compila sin errores de tipos. |
| **Salida** | Si termina sin errores, el compilador Nest generó JavaScript en `dist/`. |

---

### `npm --prefix api run test -- --runInBand`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Ejecuta **Jest** sobre los tests del API (archivos `.spec.ts`). `--runInBand` evita paralelismo agresivo y suele ser más estable en Windows. |
| **Cuándo** | CI local, después de cambios en auth/reglas/guards/services con tests. |
| **Interpretación** | Todo verde → tests pasaron. Algún fallo → leer mensaje del test y archivo indicado. |

---

### `npm run build`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Ejecuta `ng build`: empaqueta el frontend para producción (bundles optimizados). |
| **Cuándo** | Antes de publicar estáticos o verificar que el front compila. |
| **Ojo conocido** | Si Angular falla por **budgets SCSS**, un `.scss` supera tamaño máximo permitido en `angular.json`; hay que recortar estilos o subir límites con acuerdo del equipo. |

---

### `npm test` (raíz)

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Lanza **`ng test`** (Karma + Jasmine en navegador) para tests unitarios del Angular. |
| **Cuándo** | SI el proyecto tiene tests front configurados y quieres ejecutarlos. Abre navegador/headless según configuración. |

---

## 6) Corrección de errores (runbook)

Formato: **síntoma → qué revisar → qué hacer.**

### La web carga pero no hay datos / errores HTTP al API

1. Confirma que `npm run dev` (o API separado) está corriendo.
2. Revisa `api/.env` → `DATABASE_URL` correcta y sin espacios raros.
3. Ejecuta `npm run db:bootstrap` y reinicia el API.

### El API no arranca o dice que falta `DATABASE_URL`

- **Causa:** el código exige `DATABASE_URL` para Neon.
- **Arreglo:** crea o edita `api/.env` con la URL completa de Neon.

### Login con usuarios demo no funciona

- **Causa frecuente:** la base ya tenía usuarios y el seed no insertó los demo, o la contraseña no es la de la [sección 2](#2-correos-de-prueba-por-rol).
- **Arreglo:** verificar en Neon si existen los correos seed; si es base de prueba vacía o desechable, puedes ejecutar estrategia acordada con el equipo (restaurar base o bootstrap según política).

### Tablas o columnas faltantes tras actualizar código

- Ejecuta `npm run db:bootstrap` y revisa logs del proceso.
- Si persiste, revisar versión del código vs rama estable y errores Postgres en log.

### `ng build` falla por tamaño SCSS

- El mensaje indica el archivo; reducir reglas repetidas o extraer componentes.
- Solo subir `budgets` en `angular.json` con decisión de equipo.

### Probar desde móvil sin estar en la misma red Wi‑Fi

- Usar ngrok siguiendo [DESPLIEGUE_PRUEBA_NGROK.md](DESPLIEGUE_PRUEBA_NGROK.md); el navegador móvil verá tu `localhost:4200` a través del túnel.

---

## 7) Criterio de salida

Se considera el sistema validado para una entrega/demo cuando:

- Arranque local completo (`dev` + Neon) sin pasos manuales no documentados.
- Pruebas por rol y flujo público completados sin bloqueantes.
- Regresión corta en verde.
- (Recomendado) `npm --prefix api run build` y tests API en verde antes de integrar cambios grandes en backend.
