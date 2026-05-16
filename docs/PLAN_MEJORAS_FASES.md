# Plan de mejoras por fases — AZENDA

Documento vivo para seguir **qué vamos haciendo**, **qué se arregla**, **qué dejamos igual** y **qué riesgos siguen**. Marca el progreso cambiando `[ ]` por `[x]`.

**Origen:** evaluación técnica del proyecto (mayo 2026).  
**Relacionado:** [PENDIENTES_MEJORA_UX.md](PENDIENTES_MEJORA_UX.md) (producto/UX), [BACKEND.md](BACKEND.md) (API y Neon).

---

## Estrategia acordada (mayo 2026)

**Objetivo del producto:** SaaS accesible para negocios (bajo costo operativo) con **calidad** en reserva y panel — sin sobre-arquitectura prematura.

| Decisión | Elección |
|----------|----------|
| **Ahora** | **Piloto** con negocios reales (Fase 1 cerrada en código; smoke en `PRUEBAS_SISTEMA.md` al cambiar de entorno). |
| **Se mantiene igual** | Monorepo, `SqlDbService` unificado, front híbrido mock/API, Neon, WhatsApp manual, polling en citas. |
| **En pausa (hold)** | Fases **3** y **4** hasta piloto estable o necesidad clara (Fase 2 puede avanzar en paralelo al piloto). |
| **No hacer por ahora** | Varios repos Git, microservicios, refactor total de repositorios, ORM masivo. |

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
| **2** | Arquitectura backend (repositorios, servicios) | **ACTIVA** | `PublicBookingService` + `UserRepository` / `PgClientService` |
| **3** | Unificación frontend (quitar mock) | HOLD | `[ ]` Pospuesta |
| **4** | Operaciones, CI/CD y producto avanzado | HOLD | `[ ]` Pospuesta |

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
| `SqlDbService` ~2100 líneas | Sin dividir | Coste de refactor; no bloquea seguridad de login |
| Front mock + API (`MockDataService`) | Híbrido | Ya funciona para demo/piloto; unificar en Fase 3 |
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
| Datos distintos mock vs API en pantallas | Tenant ve inventario/ventas/stats incoherentes | Usar solo flujos ya en API; documentar en pruebas | Fase 3 |
| `MockDataService` en ~20 componentes | Bugs “solo en prod” o solo en demo | Priorizar pantallas del piloto en API real | Fase 3 |
| Sin tests automatizados | Regresiones en releases | Checklist manual pre-demo (`docs/PRUEBAS_SISTEMA.md`) | Fase 4 |

### Riesgo medio

| Riesgo | Impacto | Mitigación | Fase |
|--------|---------|------------|------|
| `SqlDbService` monolítico | Cambios lentos, más conflictos en Git | Cambios pequeños; un dominio a la vez | Fase 2 |
| Admin sin capa de servicio | Lógica acoplada a SQL en controllers | No tocar salvo bug crítico | Fase 2 |
| `PublicController` grande (~530 líneas) | Difícil testear reserva pública | Rate limit (Fase 1); refactor después | Fase 2 |
| Confirmación asistencia débil | Abuso de marcar asistencia ajena | Política de negocio; OTP futuro | Fase 1 opc. / producto |
| Búsqueda pública de citas | Enumeración por teléfono | Límites throttler; no listar de más en UI | Fase 1 + producto |
| IDs de cita predecibles (`appt_${Date.now()}`) | Adivinación de IDs | UUID en Fase 2 o hotfix si hace falta | Fase 2 |
| README / `api/ARCHITECTURE.md` desactualizados | Confusión onboarding | Nota en PRUEBAS_SISTEMA; Fase 3 docs | Fase 3 |

### Riesgo bajo (aceptable en MVP / piloto controlado)

| Riesgo | Notas |
|--------|--------|
| Sin email transaccional | WhatsApp manual cubre parte del valor |
| Polling 8 s en citas vs WebSocket | Suficiente para pocos usuarios concurrentes |
| Sin Docker / GitHub Actions | Despliegue manual documentado |
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

## Fase 2 — Arquitectura backend (**ACTIVA** · repositorios + servicio público)

> **Activada:** siguiente fase de código tras Fase 1. El resto de ítems siguen incrementales.

- [-] Dividir `SqlDbService` en repositorios por dominio (ver [¿Qué significa “dividir repositorios”?](#qué-significa-dividir-repositorios-no-es-el-repo-de-git))
  - [x] **Usuarios** — `UserRepository` + `PgClientService` (pool / `queryRows` / `exec` compartidos)
  - [x] **Tenants** + catálogo de planes (`plan_catalog`) + migraciones que tocaban ambos
  - [ ] Citas (appointments)
  - [ ] Catálogo (productos, servicios)
  - [ ] Ventas, branding, billing, site config
- [x] Extraer `PublicBookingService` desde `PublicController`
- [ ] Capa de servicios en admin (sin `SqlDbService` en controllers)
- [ ] Migraciones versionadas (`migrations/` en repo)
- [ ] Corregir tests e2e (`/api`, rutas reales)
- [ ] Tests mínimos: auth, booking público, tenant pausado

**Criterio de cierre:** `sql-db.service.ts` solo conexión + helpers; dominio en repos y services.

---

## Fase 3 — Unificación frontend (HOLD)

> **Cuándo activar:** piloto con tenants que usan inventario/ventas a diario o reportes de datos incorrectos.

- [ ] Inventario tenant → API
- [ ] Ventas tenant → API
- [ ] Super admin (stats, módulos) → API
- [ ] Dividir `public-booking-page` (subcomponentes + estado)
- [ ] Utilidades compartidas (`customer-name-match`, horarios públicos)
- [ ] Actualizar `README.md` y `api/ARCHITECTURE.md`
- [ ] Tests en features críticas

**Criterio de cierre:** con `useLiveAuth: true`, pantallas principales sin `MockDataService` para datos de negocio.

---

## Fase 4 — Operaciones y producto (HOLD)

> **Cuándo activar:** primeros clientes de pago, releases frecuentes o necesidad de email/push.

### Infra y calidad

- [ ] GitHub Actions (lint, test, build en PR)
- [ ] Docker Compose (opcional, dev local)
- [ ] Checklist pre-release

### Producto

- [ ] Email transaccional tras reservar
- [ ] Recordatorios programados (SMTP/SMS)
- [ ] Reseñas reales en landing/reserva
- [ ] Push / WebSocket al staff
- [ ] Calendario — optimización con datos reales

Ver [PENDIENTES_MEJORA_UX.md](PENDIENTES_MEJORA_UX.md).

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

Actualizar al cerrar Fase 1 o al activar fases siguientes.

| Métrica | Inicial (may 2026) | Tras Fase 1 | Objetivo largo plazo |
|---------|-------------------|-------------|----------------------|
| Contraseñas hasheadas | No | **Sí** | Sí |
| `password` en JSON API | Sí (empleados) | **No** (tenant empleados) | No |
| `JWT_SECRET` obligatorio en prod | No | **Sí** | Sí |
| Throttler en `public/*` | No | **Sí** (+ login acotado) | Sí |
| Helmet en API | No | **Sí** | Sí |
| Tests API `.spec.ts` | 3 | 3+ (ideal +auth) | ≥ 15 |
| Tests front | 0 | 0 | Críticos |
| Líneas `sql-db.service.ts` | ~2100 | ~2100 (OK) | < 400 si Fase 2 |
| Uso mock datos reales | ~20+ comp. | ~20+ (OK) | 0 si Fase 3 |
| CI/CD | No | No (OK) | Sí si Fase 4 |

---

## ¿Qué significa “dividir repositorios”? (NO es el repo de Git)

Solo aplica cuando se **active la Fase 2**. No es crear `azenda-api` y `azenda-web` en GitHub.

**Hoy:** `api/src/infrastructure/sql-db/sql-db.service.ts` concentra SQL, seed, migraciones ad hoc y reglas de varios dominios.

**Propuesta (futura):** clases por dominio (`TenantRepository`, `AppointmentRepository`, …) y services Nest que las usen:

```
Controller → Service (reglas) → Repository (SQL) → PostgreSQL
```

`SqlDbService` quedaría en pool + `query` + bootstrap.

| Idea | ¿Ahora? |
|------|---------|
| Varios repos Git | No |
| Microservicios | No |
| Repositorios por dominio en código | Fase 2, incremental |

---

## Orden de trabajo (vigente)

1. **Piloto** — negocios reales (Fase 1 cerrada; smoke manual al cambiar de entorno).
2. **Fase 2 (incremental)** — repositorios por dominio, capa admin, migraciones versionadas, e2e (en paralelo al piloto si aplica).
3. **Activar Fase 3** si hay incoherencias mock/API en pantallas del piloto.
4. **Activar Fase 4** con clientes de pago o releases regulares.

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
