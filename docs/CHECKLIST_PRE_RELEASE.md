# Checklist pre-release — AZENDA

Lista corta antes de desplegar o entregar una versión a piloto/clientes. Complementa la regresión detallada en [PRUEBAS_SISTEMA.md](PRUEBAS_SISTEMA.md).

---

## Automático (CI en GitHub)

En cada PR o push a `main` / `master` debe pasar el workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

| Job | Qué valida |
|-----|------------|
| **API** | `npm ci` → `build` → `test` (Jest) → `test:e2e` (smoke `/api` sin Neon) |
| **Web** | `npm ci` → `build` → `test` (Karma headless) |

En local (misma secuencia):

```bash
npm run ci
```

Solo API: `npm run ci:api`. Solo web: `npm run ci:web`.

Incluye **lint API** (`npm run lint:api` o paso `lint:ci` del job API).

---

## Manual (obligatorio antes de piloto externo)

- [ ] `api/.env` en el servidor con `DATABASE_URL` y, en producción, `JWT_SECRET` definido.
- [ ] `useLiveAuth: true` en el build de front que vaya a piloto (ver `src/environments/`).
- [ ] `CORS_ORIGINS` y `CORS` del API acordados con la URL del front.
- [ ] Smoke de [PRUEBAS_SISTEMA.md](PRUEBAS_SISTEMA.md) §4 (login tenant, super-admin, reserva pública, empleados sin `password` en JSON).
- [ ] Revisar cambios de esquema: si aplica, `npm run db:bootstrap` o migración acordada en `api/migrations/`.

---

## Opcional según el release

- [ ] Probar WhatsApp / recordatorios manuales ([RECORDATORIOS_Y_WHATSAPP.md](RECORDATORIOS_Y_WHATSAPP.md)).
- [ ] Ngrok o URL de prueba documentada ([DESPLIEGUE_PRUEBA_NGROK.md](DESPLIEGUE_PRUEBA_NGROK.md)).
- [ ] Notas de versión para el negocio (planes, límites).

---

## Qué no forma parte de este checklist

- **Docker** — descartado (ver [PLAN_MEJORAS_FASES.md](PLAN_MEJORAS_FASES.md)).
- **Email transaccional / push** — ítems de producto Fase 4, no bloquean un release de panel/API.
