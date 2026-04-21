# Arquitectura Backend (lista para separar)

Este backend vive completamente en `api/` y se puede mover a un repositorio propio sin depender del frontend.

## Limites del backend

- Codigo backend: `api/src`
- Configuracion backend: `api/package.json`, `api/tsconfig*.json`, `api/nest-cli.json`
- Pruebas backend: `api/test`
- Build backend: `api/dist`

Nada del backend depende de `../src` (Angular).

## Modulos actuales

- `auth/`: login JWT y endpoint `auth/me`
- `admin/`: endpoints de super admin
- `tenant/`: endpoints de contexto para usuarios tenant
- `infrastructure/sql-db/`: acceso a SQLite (`data/azenda.db`) con esquema y seed inicial

## Endpoints implementados (CRUD SQL)

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/ping`
- `GET /api/admin/tenants`
- `GET /api/admin/tenants/:tenantId`
- `POST /api/admin/tenants`
- `PATCH /api/admin/tenants/:tenantId`
- `DELETE /api/admin/tenants/:tenantId`
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `DELETE /api/admin/users/:userId`
- `GET /api/tenant/ping`
- `GET /api/tenant/context`

## Seguridad aplicada

- JWT Bearer
- Guard de autenticacion (`JwtAuthGuard`)
- Guard de rol y sistema (`RolesGuard`)
- Validacion global de DTOs (`ValidationPipe`)

## Guia para separarlo a otro repo despues

1. Crear repositorio nuevo `azenda-api`.
2. Copiar solo carpeta `api/*` al nuevo repo (incluyendo `.eslintrc.js` y lockfile).
3. Configurar CI/CD del API independiente.
4. Ajustar `environment.apiUrl` del frontend para apuntar al dominio del API.
5. Mantener contrato por versionado de endpoints (`/api/v1` opcional en siguiente fase).
