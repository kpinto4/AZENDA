# Backend — alcance pendiente (Azenda)

Este repositorio incluye un **front-end Angular** con una **simulación amplia en memoria** (tenants editables, usuarios globales, ventas con descuento de stock, movimientos de inventario, estados de cita, etc.) para demos de equipo. Nada de eso persiste entre recargas. La persistencia, seguridad y reglas de negocio reales vivirán en el API. Este documento resume qué debe cubrir el backend.

## Autenticación y autorización

- Registro que cree **usuario + tenant** (y opcionalmente plan trial).
- Login con JWT (o sesiones) con claims: `user_id`, `tenant_id`, `role` (`SUPER_ADMIN`, `ADMIN`, `EMPLEADO`, opcional `CLIENTE_FINAL`).
- **Super Admin**: rutas bajo prefijo `/api/admin/*` sin `tenant_id` o con scope global.
- **Tenant**: todas las queries filtradas por `tenant_id` salvo endpoints públicos de reserva.

## Multi-tenant

- Tabla `tenants` (nombre, slug público, plan, límites, branding).
- **Slug único** para URLs de reserva: `/reservar/:slug`.
- Límites por plan (empleados, citas/mes, módulos activos) aplicados **en servidor**.

## Módulos por tenant

- Flags: `citas` (base), `ventas`, `inventario`.
- El front ya puede ocultar menús; el API debe **rechazar** operaciones de módulos no contratados.

## Dominio principal (REST sugerido)

| Área | Endpoints (orientativos) | Notas |
|------|--------------------------|--------|
| Tenants (super) | `GET/POST/PATCH/DELETE /admin/tenants` | CRUD, asignación de plan |
| Planes | `GET/PATCH /admin/plans` | Límites y precios |
| Usuarios | `GET /admin/users`, bloqueos, reset | Auditoría |
| Servicios | `GET/POST/PATCH /tenants/:id/services` | Duración, precio |
| Empleados | `CRUD /tenants/:id/employees` | Horarios, servicios asignados |
| Disponibilidad | `GET /tenants/:id/availability?service=&date=` | Reglas: horario negocio, empleados, citas existentes |
| Citas | `CRUD /tenants/:id/appointments` | Estados, conflictos |
| Ventas | `POST /tenants/:id/sales`, listados | Vínculo opcional `appointment_id` |
| Inventario | `products`, `stock_movements` | Transacción: venta → movimiento de salida |
| Reserva pública | `GET /public/:slug/meta`, `POST /public/:slug/bookings` | Sin auth; anti-abuso (rate limit, captcha opcional) |
| WhatsApp | Config por tenant (teléfono, plantilla); futuro webhook | |

## Reglas críticas de negocio

- **Disponibilidad**: zona horaria del tenant, buffers entre citas, feriados.
- **Ventas + inventario**: descuento atómico de stock; política de stock negativo explícita.
- **Idempotencia** en creación de reservas públicas (evitar dobles clics).

## Integraciones futuras

- Pasarela de pago (suscripción y/o TPV).
- Notificaciones (email/SMS/push).
- WhatsApp Business API / chatbot (fase posterior).

## Contrato con el front

- Sustituir `MockSessionService` / `MockDataService` por servicios que llamen al API.
- Guards de ruta deberían validar token y refresco; roles reales desde el servidor.
- Variables de entorno: `environment.apiUrl`, feature flags si aplica.
