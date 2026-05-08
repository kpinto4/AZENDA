# Backend (NestJS + Neon)

Este documento resume **qué es** el backend del monorepo AZENDA, **con qué habla** el front y **qué variables** necesitas, en lenguaje claro.

---

## Rol del backend

| Pregunta | Respuesta |
| --- | --- |
| **Qué es** | Un API HTTP hecho con **NestJS** que expone rutas bajo `/api/...` (el prefijo exacto depende de cómo esté montado el proxy en desarrollo). |
| **Para qué sirve** | Autenticación, datos multi-tenant (citas, ventas, configuración), endpoints públicos de reserva y rutas de administración. |
| **Dónde vive el código** | Carpeta `api/src/`. |
| **Dónde viven los datos** | En **PostgreSQL en Neon**, conectado solo mediante `DATABASE_URL` en `api/.env`. |

---

## Configuración mínima

| Archivo / variable | Qué hace |
| --- | --- |
| `api/.env` → `DATABASE_URL` | URL de conexión a Neon. Sin ella el servicio de base de datos del API no puede funcionar correctamente. |
| (Opcional) `PORT` | Puerto HTTP del API si el proyecto lo define en `main.ts` / env. |

Inicializar esquema y datos demo (primera vez o tras base vacía):

```powershell
npm run db:bootstrap
```

**Qué hace `db:bootstrap`:** ejecuta el script del API que crea o ajusta tablas y, si no hay usuarios, inserta tenants y usuarios de prueba. Detalle en [PRUEBAS_SISTEMA.md → db:bootstrap](PRUEBAS_SISTEMA.md#npm-run-dbbootstrap).

---

## Arranque local

Desde la **raíz** del monorepo (recomendado: web + API juntos):

```powershell
npm run dev
```

| Servicio | URL típica | Qué es |
| --- | --- | --- |
| Frontend (Angular) | `http://localhost:4200` | La SPA que consume el API. |
| API (Nest) | `http://localhost:3000` | El backend; el front suele llamar vía proxy en dev (`/api`). |

Si solo quieres el API:

```powershell
npm run start:api
```

---

## Prefijos de API (orientativo)

La lista ayuda a orientarse en el código y en herramientas tipo Postman. Las rutas exactas pueden incluir prefijo global según versión del proyecto.

| Área | Prefijo orientativo | Para quién |
| --- | --- | --- |
| Administración | `/api/admin/...` | Super admin; operaciones globales. |
| Tenant | `/api/tenant/...` | Usuarios del negocio (admin/empleado) con JWT. |
| Público | `/api/public/...` | Sin login; reserva por slug, etc. |
| Acceso / salud | según código | Ping o helpers si existen en el proyecto. |

---

## Documentación relacionada

| Documento | Contenido |
| --- | --- |
| [PRUEBAS_SISTEMA.md](PRUEBAS_SISTEMA.md) | Despliegue, comandos uno a uno, pruebas por rol, runbook. |
| [PLANES_Y_FACTURACION.md](PLANES_Y_FACTURACION.md) | Endpoints y lógica de facturación por tenant. |
| [DESPLIEGUE_PRUEBA_NGROK.md](DESPLIEGUE_PRUEBA_NGROK.md) | Exponer el front local con ngrok. |

Para arquitectura técnica detallada del API, si existe en el repo, revisar `api/ARCHITECTURE.md`.
