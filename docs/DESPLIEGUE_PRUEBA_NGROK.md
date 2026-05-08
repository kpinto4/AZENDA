# Pruebas con ngrok (acceso externo al entorno local)

Esta guía explica **por qué** usar ngrok, **qué** necesitas y **qué** puede fallar.

---

## Para qué sirve ngrok aquí

| Concepto | Explicación |
| --- | --- |
| **Problema** | Tu navegador en el móvil no puede abrir `http://localhost:4200` de tu PC porque `localhost` en el teléfono es el propio teléfono. |
| **Solución** | ngrok crea un túnel HTTPS público que reenvía tráfico a tu `localhost:4200`. |
| **Alcance** | Solo para **demos y pruebas temporas**. No sustituye un hosting productivo. |

La guía completa de despliegue local, cuentas de prueba y mantenimiento está en [PRUEBAS_SISTEMA.md](PRUEBAS_SISTEMA.md).

---

## Requisitos previos

| Requisito | Para qué |
| --- | --- |
| Proyecto levantado con Neon | `DATABASE_URL` en `api/.env`, luego `npm run db:bootstrap` y `npm run dev`. |
| ngrok instalado y **autenticado** en tu cuenta | ngrok necesita tu token para URLs estables según plan. |

---

## Pasos

### 1) Levantar AZENDA en local

```powershell
npm run db:bootstrap
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `db:bootstrap` | Prepara base en Neon (tablas + seed si aplica). |
| `dev` | Arranca Angular en `:4200` y el API (puerto según configuración, típicamente `:3000`). |

Comprueba en el PC: `http://localhost:4200` abre la app.

### 2) Abrir túnel solo al frontend

```powershell
ngrok http 4200
```

| Qué obtienes | Una URL `https://....ngrok-free.dev` en la columna **Forwarding**. |
| --- | --- |
| **Importante** | El front sigue llamando al API como en local (normalmente proxy a `/api`). El API debe seguir corriendo en la misma máquina. |

### 3) Probar desde otro dispositivo

Abre la URL HTTPS de ngrok en el móvil y navega como en local (login, `/app`, `/reservar/...`).

---

## Errores frecuentes

| Código o mensaje | Qué significa | Qué hacer |
| --- | --- | --- |
| `ERR_NGROK_8012` | ngrok no puede conectar al puerto local. | Comprueba que `npm run dev` siga activo y que el puerto sea **4200** (o el que hayas puesto en `ngrok http ...`). |
| `401` / `500` al usar la app | El front no puede hablar bien con el API o la base falla. | Revisa `DATABASE_URL`, ejecuta `npm run db:bootstrap`, mira consola de red del navegador y logs del API. |
| `ERR_NGROK_334` | Conflicto de dominio/endpoint en tu cuenta ngrok. | Cierra túneles viejos o usa otro comando según documentación ngrok. |
| “Host not allowed” (Angular) | El dev server rechaza el host del túnel. | En este repo suele estar permitido `.ngrok-free.dev`; si cambia el dominio de ngrok, puede hacer falta actualizar `allowedHosts` en la config de Angular. |

---

## Buenas prácticas

- No compartas el **authtoken** de ngrok.
- Trata la URL pública como **pública de verdad**: no uses datos personales reales sin acuerdo.
- Para producción usa despliegue real (hosting + dominio + HTTPS gestionado).
