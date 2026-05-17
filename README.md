# Azenda

SaaS multi-tenant (**Angular 19** + **NestJS**) para **citas**, **ventas** e **inventario**. El front puede trabajar en **dos modos**:

| Modo | Cómo | Datos |
|------|------|--------|
| **Piloto / API** | `src/environments/environment.ts` → `useLiveAuth: true` | Login JWT, tenant y super-admin contra PostgreSQL (Neon). Ver [`docs/BACKEND.md`](docs/BACKEND.md) y [`docs/PRUEBAS_SISTEMA.md`](docs/PRUEBAS_SISTEMA.md). |
| **Demo solo front** | `useLiveAuth: false` | `MockDataService` en memoria (sin persistencia al recargar). |

Plan de evolución por fases: [`docs/PLAN_MEJORAS_FASES.md`](docs/PLAN_MEJORAS_FASES.md) (**Fases 1–4 cerradas** · mayo 2026; CI + piloto con `useLiveAuth: true`).

## Requisitos

- Node.js LTS.
- Para el API: `DATABASE_URL` en `api/.env` (Neón). Sin base, el backend no arranca en modo completo.

## Desarrollo

```bash
npm install
npm run dev
```

Levanta el **API** (`http://localhost:3000` por defecto) y la **web** (`http://localhost:4200`). El front en dev proxea `/api` al Nest (ver `proxy.conf.json`). Solo Angular: `npm start`.

Primera vez con base vacía (usuarios/tenants demo hasheados):

```bash
npm run db:bootstrap
```

## Build

```bash
npm run build
```

Salida en `dist/azenda`. API: `npm --prefix api run build`.

## Tests y CI

```bash
npm test              # solo front (Karma)
npm run ci            # API build + tests + e2e smoke + web build + test
```

En GitHub: workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Antes de desplegar: [`docs/CHECKLIST_PRE_RELEASE.md`](docs/CHECKLIST_PRE_RELEASE.md).

## Mapa de rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing |
| `/auth/iniciar-sesion` | Login (API si `useLiveAuth`, si no reglas demo por correo) |
| `/auth/registro` | Registro (demo) |
| `/app/...` | Panel tenant (guard + JWT en modo API) |
| `/super/...` | Super admin (guard + JWT en modo API) |
| `/reservar/:slug` | Reserva pública |

### Modo demo (`useLiveAuth: false`)

Todo comparte **`MockDataService`**. **Restablecer demo** en la landing; accesos rápidos sin contraseña real.

**Login de demostración** (correo contiene):

- **`super`** → Super Admin.
- **`spa`** → Spa Relax · **`clinica`** / **`trial`** → Clínica · **`empleado`** → empleado · otro correo → Barbería Centro.

### Modo API (`useLiveAuth: true`)

Usuarios y contraseñas reales en base (p. ej. `super@azenda.dev` tras `db:bootstrap`). El `?redirect=` del login respeta el rol (no manda un super admin a `/app` por un redirect antiguo).

## Documentación

| Documento | Contenido |
|-----------|------------|
| [`docs/BACKEND.md`](docs/BACKEND.md) | API, variables, prefijos de rutas |
| [`docs/PRUEBAS_SISTEMA.md`](docs/PRUEBAS_SISTEMA.md) | Comandos, smoke, roles |
| [`docs/PLAN_MEJORAS_FASES.md`](docs/PLAN_MEJORAS_FASES.md) | Fases 1–4 y criterios de cierre |
| [`docs/CHECKLIST_PRE_RELEASE.md`](docs/CHECKLIST_PRE_RELEASE.md) | Checklist antes de desplegar |
