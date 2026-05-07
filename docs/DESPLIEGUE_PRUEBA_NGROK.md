# Despliegue De Prueba Con Ngrok

Esta guía explica solo cómo exponer AZENDA temporalmente a Internet para pruebas (sin deploy productivo).

## Qué es este modo

- Es una URL pública temporal para compartir la app local.
- Sirve para pruebas desde móvil, demos internas o validación rápida.
- No reemplaza un deploy real en servidor.

## Requisitos

- Proyecto corriendo en local con:
  - frontend en `http://localhost:4200`
  - api en `http://localhost:3000`
- Ngrok instalado y autenticado.

## Paso 1: Levantar AZENDA local

Desde la raíz del repo:

```powershell
npm run dev
```

Deja esta terminal abierta.

## Paso 2: Abrir túnel ngrok al frontend

En otra terminal:

```powershell
ngrok http 4200
```

Usa la URL `https://...ngrok-free.dev` que aparezca en `Forwarding`.

## Paso 3: Probar desde otro dispositivo

- Abre la URL pública de ngrok en el móvil.
- Prueba rutas como:
  - `/`
  - `/reservar/<slug>`

## Errores comunes

- `ERR_NGROK_334`:
  - ya existe un endpoint activo con ese dominio.
  - solución: usar `ngrok http 4200` sin `--url` o cerrar el endpoint anterior.

- `ERR_NGROK_8012`:
  - ngrok no puede conectar al servicio local.
  - solución: verificar que `npm run dev` siga corriendo.

- `Blocked request. This host ... is not allowed`:
  - faltaba permitir host externo en dev server.
  - en este repo ya se habilitó `allowedHosts` para `.ngrok-free.dev`.

## Buenas prácticas

- No compartir el authtoken de ngrok.
- Usar este método solo para pruebas temporales.
- Para uso estable con clientes, preparar un deploy real.

