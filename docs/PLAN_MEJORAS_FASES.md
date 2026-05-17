# Plan de mejoras por fases — AZENDA

Documento vivo para seguir **qué vamos haciendo**, **qué se arregla**, **qué dejamos igual** y **qué riesgos siguen**. Marca el progreso cambiando `[ ]` por `[x]`.

**Origen:** evaluación técnica del proyecto (mayo 2026).  
**Relacionado:** [PENDIENTES_MEJORA_UX.md](PENDIENTES_MEJORA_UX.md) (producto/UX), [BACKEND.md](BACKEND.md) (API y Neon).

---

## Estrategia acordada (mayo 2026)

**Objetivo del producto:** SaaS accesible para negocios (bajo costo operativo) con **calidad** en reserva y panel — sin sobre-arquitectura prematura.

| Decisión | Elección |
|----------|----------|
| **Ahora** | **Piloto** y releases con CI (`npm run ci`); smoke en `PRUEBAS_SISTEMA.md` + [`CHECKLIST_PRE_RELEASE.md`](CHECKLIST_PRE_RELEASE.md). |
| **Se mantiene igual** | Monorepo, `SqlDbService` unificado, mock solo demo/`useLiveAuth: false`, Neon, WhatsApp manual, polling en citas. |
| **Plan técnico** | Fases **1–4 cerradas** (mayo 2026). Integraciones de pago (SMTP masivo, Meta WA API, WebSocket) solo si el negocio lo pide. |
| **No hacer por ahora** | Varios repos Git, microservicios, refactor total de repositorios, ORM masivo, **Docker** (dev con `npm run dev` + Neon; contenedores añaden complejidad sin beneficio claro). |

**Veredicto operativo:** con Fase 1 cerrada → **piloto con negocios reales y cuentas serias**. Sin Fase 1 → solo demo interna o entornos de confianza.

---

## Cómo usar este documento

| Símbolo | Significado |
|---------|-------------|
| `[ ]` | Pendiente |
| `[x]` | Hecho |
| `[-]` | En curso |
| **HOLD** | Acordado posponer; no es olvido |

Actualiza al cerrar ítems. Si cambia la estrategia, edita la sección [Estrategia acordada](#estrategia-acordada-mayo-2026) y el historial al final.

---

## Resumen de fases

| Fase | Enfoque | Prioridad | Estado |
|------|---------|-----------|--------|
| **1** | Seguridad de cuentas y API expuesta | **Cerrada** | Obligatorio técnico hecho; opcionales de Fase 1 pendientes |
| **2** | Arquitectura backend (repositorios, servicios) | **Cerrada** (código mayo 2026) | Repos por dominio + fachada `SqlDbService`; admin usa servicios; `api/migrations/README`; e2e smoke `/api`; tests billing / guard / reserva mínimos |
| **3** | Unificación frontend (quitar mock en datos de negocio) | **Cerrada** (mayo 2026) | Con `useLiveAuth: true`, panel tenant y super-admin usan API; mock solo demo y rutas públicas; utilidades reserva pública extraídas + tests Karma (guards, horarios, utils) |
| **4** | Operaciones, CI/CD y producto avanzado | **Cerrada** (mayo 2026) | CI + lint API; checklist; hook notificación reserva; split reserva pública; tests venta/login; branding sin mock en CSS |

---

## Qué se arregla al cerrar Fase 1 (y qué no)

### Se corrige (riesgos de cuentas y abuso básico)

| Problema actual | Qué hace la Fase 1 | Archivos / área típica |
|-----------------|-------------------|-------------------------|
| Contraseñas en texto plano en BD | Hash (bcrypt/argon2) en login, alta, seed | `sql-db.service.ts`, `auth.service.ts` |
| Comparación `password = ?` en SQL | Verificación contra hash | `findUserByCredentials` |
| API devuelve `password` de empleados | Quitar campo de respuestas DTO | `tenant.service.ts`, DTOs tenant |
| JWT con secreto por defecto en dev | `JWT_SECRET` obligatorio si `NODE_ENV=production` | `auth.module.ts`, `jwt.strategy.ts` |
| Endpoints públicos sin límite de uso | Rate limiting (`@nestjs/throttler`) | `public/*`, opcional `auth/login` |
| Cabeceras HTTP básicas | Helmet en API | `main.ts` |
| CORS permisivo en prod | Revisar `CORS_ORIGINS` (sin `*` con credenciales) | `main.ts` |

### Se mantiene igual (aceptado a corto plazo)

| Área | Situación | Motivo |
|------|-----------|--------|
| `SqlDbService` voluminoso | Fachada + bootstrap/esquema; dominio en repos / servicios aplicación | Migrar solo con runner explícito cuando Fase 4 lo pida |
| Front mock + API (`MockDataService`) | Híbrido solo donde aporta demo (`useLiveAuth: false`) o UI auxiliar | Fase 3 cerró datos de negocio tenant/super en API con `useLiveAuth: true` |
| Sin CI/CD en repo | Manual | Fase 4; no impide hashing |
| Confirmación asistencia solo id + nombre | Sin OTP aún | Ítem opcional Fase 1; ver riesgos residuales |
| WhatsApp manual (`wa.me`) | Igual | Alineado con bajo costo operativo |
| Monorepo Angular + Nest | Igual | Mejor opción para equipo y coste |

---

## Riesgos que aún persisten (después de Fase 1)

Usar esta tabla en revisiones de piloto y soporte. **No son fallos de la Fase 1** si se acordó posponer el resto.

### Riesgo alto (producto / operación — no “cuenta hackeada”)

| Riesgo | Impacto | Mitigación hasta Fase 3+ | Fase que lo aborda |
|--------|---------|---------------------------|-------------------|
| Datos distintos mock vs API en pantallas | Tenant ve inventario/ventas/stats incoherentes | Usar `useLiveAuth: true` en piloto; checklist `PRUEBAS_SISTEMA.md` | Fase 3 (mitigado en panel) |
| `MockDataService` en ~20 componentes | Bugs “solo en prod” o solo en demo | Prioridad en rutas `/app` y `/super` con API; landing/reserva pública puede seguir mock | Fase 3 + Fase 4 |
| Pocos tests automatizados vs dominio creciente | Regresiones silenciosas | `npm test` / `npm run test:e2e`; checklist manual (`docs/PRUEBAS_SISTEMA.md`) | Fase 4 amplía cobertura |

### Riesgo medio

| Riesgo | Impacto | Mitigación | Fase |
|--------|---------|------------|------|
| `SqlDbService` aún con bootstrap/schema | DDL y migraciones ligeras en arranque; dominio mayormente en repos | Seguir sacando sólo cuando duela menos que el diff |
| `PublicController` grande (~530 líneas) | Difícil testear reserva pública completa | `PublicBookingService` + tests puntuales; más tests en producto estable | Fase 3 / Fase 4 |
| Confirmación asistencia débil | Abuso de marcar asistencia ajena | Política de negocio; OTP futuro | Fase 1 opc. / producto |
| Búsqueda pública de citas | Enumeración por teléfono | Límites throttler; no listar de más en UI | Fase 1 + producto |
| IDs de cita predecibles (`appt_${Date.now()}`) | Adivinación de IDs | UUID en Fase 2 o hotfix si hace falta | Fase 2 |
| README / `api/ARCHITECTURE.md` desactualizados | Confusión onboarding | Nota en PRUEBAS_SISTEMA; Fase 3 docs | Fase 3 |

### Riesgo bajo (aceptable en MVP / piloto controlado)

| Riesgo | Notas |
|--------|--------|
| Sin email transaccional | WhatsApp manual cubre parte del valor |
| Polling 8 s en citas vs WebSocket | Suficiente para pocos usuarios concurrentes |
| Sin Docker (descartado) / sin GitHub Actions aún | Despliegue manual documentado; `npm run dev` + Neon |
| TypeScript 5.7 (raíz) vs 5.1 (api) | Alinear cuando toque Fase 4 |
| Utilidades duplicadas front/API | Sin impacto en seguridad de cuentas |

### Lo que Fase 1 sí elimina (dejar de vigilar tras cerrarla)

- Robo masivo de contraseñas por dump de BD (texto plano).
- Exposición de contraseñas en JSON de empleados.
- Tokens JWT firmables con secreto conocido en producción.
- Abuso barato por scraping masivo en `public/*` (mitigado con throttler).

---

## Fase 1 — Seguridad de cuentas (**CERRADA** · mayo 2026)

> **Objetivo:** cuentas y API listas para piloto real. **No** incluye refactor de arquitectura ni quitar mock.

### Checklist obligatorio

- [x] **Hashing de contraseñas** (bcrypt o argon2) en login, alta de usuarios y seed
- [x] **Migración de usuarios existentes** en Neon (re-hashear en bootstrap o reset en demo)
- [x] **Dejar de devolver `password`** en respuestas API (`tenant.service.ts`, admin si aplica)
- [x] **`JWT_SECRET` obligatorio** en producción (fallar al arrancar si falta)
- [x] **Rate limiting** en rutas `public/*` (y valorar `POST /api/auth/login`)
- [x] **Helmet** en el API
- [x] **CORS** revisado para producción (`CORS_ORIGINS` explícito)

### Checklist opcional (misma fase, si hay tiempo)

- [ ] **Confirmación de asistencia pública** — token/OTP en lugar de solo `appointmentId` + nombre
- [ ] **IDs de cita** — UUID en lugar de `appt_${Date.now()}` (hotfix de seguridad menor)

### Criterio de “Fase 1 cerrada”

- [x] Ninguna contraseña en texto plano en BD
- [x] Ningún endpoint devuelve `password` en JSON
- [x] Producción no arranca sin `JWT_SECRET`
- [x] Throttler activo en rutas públicas críticas
- [ ] **Smoke / regresión manual** al desplegar o antes del primer piloto externo (login, empleados API, reserva pública, super admin — `docs/PRUEBAS_SISTEMA.md`). *No bloquea el cierre técnico de Fase 1; sí el “go” operativo a terceros.*

### Tras Fase 1 — qué puedes prometer

| Sí | No (aún) |
|----|----------|
| Cuentas con contraseña almacenada de forma segura | “Arquitectura enterprise” |
| Piloto con negocios de confianza | Producción masiva abierta sin checklist |
| API pública con límites básicos anti-abuso | Cero riesgo de inconsistencia mock/API |

---

## Fase 2 — Arquitectura backend (**CERRADA en código** · mayo 2026)

> **Objetivo cumplido:** repositorios por dominio donde aportaba más, `SqlDbService` como **fachada estable** (misma API para el resto del monorepo), capa de aplicación en admin, documentación de migraciones futuras y tests/e2e mínimos ejecutables en CI sin Neon.

- [x] Dividir `SqlDbService` en repositorios por dominio (incremental; ver [¿Qué significa “dividir repositorios”?](#qué-significa-dividir-repositorios-no-es-el-repo-de-git))
  - [x] **Usuarios** — `UserRepository` + `PgClientService`
  - [x] **Tenants** + catálogo de planes (`plan_catalog`)
  - [x] Citas — `AppointmentRepository`
  - [x] Catálogo tenant — `TenantCatalogRepository`
  - [x] Ventas + visitas en tienda — `TenantRetailRepository`
  - [x] Branding tenant (`tenant_branding`) — `TenantBrandingRepository`
  - [x] Config sitio plataforma (`platform_site_config`) — `PlatformSiteConfigRepository`
  - [x] Billing (snapshot + cotización cambio plan, sin SQL extra) — `TenantBillingService`
- [x] Extraer `PublicBookingService` desde `PublicController`
- [x] Capa de servicios en admin (`Admin*Service`; controladores sin `SqlDbService`)
- [x] Migraciones versionadas — carpeta `api/migrations/` con README (runner explícito en Fase 4)
- [x] Corregir tests e2e — smoke `/api` sin exigir `DATABASE_URL` completo
- [x] Tests mínimos — billing, `TenantStatusGuard` (tenant pausado), caso `PublicBookingService`

**Criterio de cierre (pragmático):** dominio de negocio principal fuera del monolito SQL; `SqlDbService` conserva **arranque**, **esquema/bootstrap** y **delegación** compatible con el código existente (`tenant/*`, `public/*`, `auth/*`).

---

## Fase 3 — Unificación frontend (**CERRADA** · mayo 2026)

> **Cierre:** con `environment.useLiveAuth === true`, las pantallas **tenant** (`/app/…`) y **super-admin** (`/super/…`) obtienen datos de negocio desde el API. `MockDataService` queda para demo (`useLiveAuth: false`), landing y piezas auxiliares sin bloquear piloto.

- [x] Inventario tenant → API (`tenant-inventory`)
- [x] Catálogo público tenant (`/app/catalogo` / inventario) — productos y servicios vía API
- [x] Ventas tenant → API (`tenant-sales`: ventas, catálogo para stock, visitas tienda; mock solo sin API o sin módulo ventas)
- [x] Super admin — `GET /admin/platform-stats`, usuarios `admin/users`, resto de pantallas ya enlazadas al API donde aplica
- [x] Utilidades alineadas con API — `src/app/core/customer-name-match.ts`, `public-booking-hours.ts` (convención compartida con Nest)
- [x] `README.md` y este plan actualizados
- [x] Tests front Karma — `customer-name-match.spec.ts`, `public-booking-hours.spec.ts`, `public-booking-page.utils.spec.ts`, `auth.guards.spec.ts` (con `provideHttpClient` / testing en TestBed)
- [x] Reserva pública más testeable — lógica auxiliar en `public-booking-page.utils.ts` consumida por `public-booking-page.component.ts`

**Criterio de cierre (alcanzado):** rutas principales de panel tenant y super-admin **sin** depender de `MockDataService` para datos de negocio cuando hay sesión API.

**Diferido a Fase 4 (no bloquea cierre):** refactor grande de `public-booking-page` en subcomponentes (la extracción a `public-booking-page.utils.ts` es solo el primer paso); más tests (login redirect, flujo venta API); retirar por completo el mock en landing/reserva si el producto deja de necesitar demo sin API.

---

## Fase 4 — Operaciones y producto (**CERRADA** · mayo 2026)

> **Cierre MVP operativo:** CI completa, calidad front mínima, hook de notificación tras reservar, mock reducido en branding público. Lo que requiere proveedor de pago (SMTP transaccional masivo, cron SMS, WebSocket, reseñas en BD) queda **fuera de alcance** hasta decisión de negocio — ver tabla «Diferido post–Fase 4».

### Calidad front (post–Fase 3)

- [x] Dividir wizard de reserva en subcomponentes — `steps/public-booking-service-step`, `-schedule-step`, `-confirm-step` (+ `public-booking.types.ts`)
- [x] Más tests front — `login-page.component.spec.ts` (redirect), `tenant-sales.component.spec.ts` (venta API); guards ampliados
- [x] Branding público sin depender de `MockDataService` para CSS — `tenant-branding-css.ts` (landing ya usaba API)

### Infra y calidad

- [x] GitHub Actions — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): **lint** + build + test API y web; sin Neon en CI
- [x] Lint API en CI — `npm run lint:ci` (Prettier `endOfLine: auto`, regla `_` en eslint)
- [x] ~~Docker Compose~~ — **descartado**
- [x] Checklist pre-release — [`CHECKLIST_PRE_RELEASE.md`](CHECKLIST_PRE_RELEASE.md)
- [x] Scripts locales — `npm run ci`, `lint:api`, `ci:api`, `ci:web`

### Producto (alcance Fase 4)

- [x] **Notificación tras reservar** — `BookingNotificationService` (log; opcional `BOOKING_NOTIFY_EMAIL` para copia operativa; SMTP cliente pendiente de proveedor)
- [x] **Recordatorios al cliente** — WhatsApp manual del negocio ([RECORDATORIOS_Y_WHATSAPP.md](RECORDATORIOS_Y_WHATSAPP.md)); sin cron SMTP en esta fase
- [x] **Calendario panel** — datos reales vía API en modo live (sin optimización extra; medir en piloto)
- [x] **Avisos staff** — polling 8 s + badge en menú Citas (suficiente MVP)

### Diferido post–Fase 4 (no bloquea el plan)

| Ítem | Motivo |
|------|--------|
| SMTP transaccional al cliente final | Requiere proveedor y coste; hook listo |
| Recordatorios programados (cron) | Mismo criterio |
| Reseñas reales en BD/UI | Sin modelo de datos; UI ya honesta (sin falsas) |
| Push / WebSocket | Polling cubre MVP piloto |
| Split «Mis citas» / «Tienda» en reserva pública | Segunda iteración si hace falta |

Ver [PENDIENTES_MEJORA_UX.md](PENDIENTES_MEJORA_UX.md) para la lista viva de producto.

---

## Principios de producto (coste vs calidad)

Referencia para no desviar esfuerzo:

1. **Un tenant = una fila en BD compartida** — máximo ahorro infra.
2. **Monorepo** — un comando `npm run dev`, menos CI duplicado.
3. **Calidad visible** = reserva móvil, panel citas, pocos errores 500 — no microservicios.
4. **Integraciones caras** (Meta WhatsApp API, email masivo, K8s) — solo cuando el ingreso o volumen lo pida.
5. **Seguridad de cuentas** — no negociable antes de piloto externo.

---

## Seguimiento rápido (métricas)

Actualizar cuando cambien fases o coberturas.

| Métrica | Inicial (may 2026) | Estado conocido | Objetivo largo plazo |
|---------|-------------------|-----------------|----------------------|
| Contraseñas hasheadas | No | **Sí** (Fase 1) | Sí |
| `password` en JSON API | Sí (empleados) | **No** (Fase 1) | No |
| `JWT_SECRET` obligatorio en prod | No | **Sí** | Sí |
| Throttler en `public/*` | No | **Sí** (+ login acotado) | Sí |
| Helmet en API | No | **Sí** | Sí |
| Tests API (Jest `src`) | 3 suites | **7 suites**, ~20 casos (+ notificación reserva) | ≥ 15 casos |
| Tests front | 0 | **~21 casos Karma** (+ login redirect, venta API live) | Críticos + smoke UI |
| Líneas `sql-db.service.ts` | ~2100 | Menor; fachada + bootstrap (Fase 2) | Opcional afilar con runner migraciones |
| Uso mock datos reales | ~20+ comp. | **Reducido en `/app` y `/super` con API** | 0 en todo el front solo si Fase 4 |
| CI/CD | No | **GitHub Actions** (lint + build + test) | Releases etiquetados si hace falta |

---

## ¿Qué significa “dividir repositorios”? (NO es el repo de Git)

**Fase 2 (cerrada en código):** no es crear `azenda-api` y `azenda-web` en GitHub. Se añadieron repositorios Nest por dominio y servicios de aplicación (`TenantBillingService`, `Admin*Service`) sobre `PgClientService`.

**Qué queda en `SqlDbService`:** bootstrap/semilla, creación de tablas y migraciones ligeras al arranque, y **delegación** hacia repos/servicios para mantener compatibilidad con el código existente.

```
Controller → Service (reglas HTTP / permisos) → Repository o SqlDbService (fachada) → PostgreSQL
```

| Idea | ¿Ahora? |
|------|---------|
| Varios repos Git | No |
| Microservicios | No |
| Repositorios por dominio en código | **Sí (Fase 2, incremental)** |

---

## Orden de trabajo (vigente)

1. **Piloto / releases** — `useLiveAuth: true`, `npm run ci` en PR, smoke + [`CHECKLIST_PRE_RELEASE.md`](CHECKLIST_PRE_RELEASE.md).
2. **Fases 1–4** — **cerradas** en código (plan técnico completo).
3. **Producto avanzado** (SMTP masivo, reseñas BD, WebSocket) — solo con ingreso o volumen que lo justifique.

---

## Historial de cambios

| Fecha | Nota |
|-------|------|
| 2026-05-15 | Documento creado (evaluación técnica) |
| 2026-05-15 | Estrategia “solo Fase 1”; fases 2–4 en HOLD; tablas qué se arregla / riesgos residuales; principios coste vs calidad |
| 2026-05-16 | Fase 1 obligatoria en código: bcrypt, migración plaintext→hash al arranque/bootstrap, sin `password` en JSON tenant empleados, JWT/CORS/Helmet/throttler en prod y límites en `public` + `auth/login` |
| 2026-05-16 | Fase 2: extraído `PublicBookingService`; controlador público delegador |
| 2026-05-16 | Fase 2: `PgClientService`, `UserRepository`; `SqlDbService` usa cliente PG centralizado |
| 2026-05-16 | Fase 2: `TenantRepository` + defaults `plan-catalog` + mapper branding fila; tenants/plan_catalog parcialmente fuera del monolito |
| 2026-05-16 | Fase 2: `AppointmentRepository`; SQL de citas extraído de `SqlDbService` (fachada sin cambio de llamadas) |
| 2026-05-16 | Fase 2: `TenantCatalogRepository`; productos y servicios de tenant fuera de `SqlDbService` |
| 2026-05-16 | Fase 2: `TenantRetailRepository`; ventas y visitas en tienda fuera de `SqlDbService` |
| 2026-05-16 | **Fase 2 cerrada** (branding, site config, billing, admin services, tests, migrations doc) |
| 2026-05-16 | **Fase 3 activada:** catálogo público tenant (`tenant-catalog`) contra API con `useLiveAuth` |
| 2026-05-16 | Inventario tenant: `tenant-inventory` alineado a `tenant-catalog` (`isInventoryLiveApi`), carga con cleanup, stock con API y sin exigir slug antes de llamadas live |
| 2026-05-16 | Fase 3: `GET /admin/platform-stats` + super dashboard / estadísticas / módulos leen BD con `useLiveAuth` |
| 2026-05-16 | **Fase 3 cerrada:** panel tenant + super-admin con API (`useLiveAuth`); README; tests Karma (`customer-name-match`, `public-booking-hours`, `public-booking-page.utils`, `auth.guards` con `provideHttpClient`); `public-booking-page.utils.ts`; split mayor de reserva pública y más tests → Fase 4 |
| 2026-05-16 | Fase 4: **Docker descartado** — dev/despliegue sin contenedores; priorizar CI (Actions) y checklist manual |
| 2026-05-16 | **Fase 4 activada:** workflow CI (API + web), scripts `npm run ci`, `CHECKLIST_PRE_RELEASE.md`; lint API en CI pendiente |
| 2026-05-16 | **Fase 4 cerrada:** lint en CI; `BookingNotificationService`; split wizard reserva; tests login/ventas; `tenant-branding-css`; producto caro diferido explícitamente |
