# Azenda

SaaS multi-tenant (front-end) para **citas**, **ventas** e **inventario**, construido con **Angular 19**. Los datos son **simulados en memoria** para poder enseñar flujos y UI; el trabajo de API y persistencia está descrito en [`docs/BACKEND.md`](docs/BACKEND.md).

## Requisitos

- Node.js LTS recomendado (el CLI de Angular 19 suele probarse con versiones LTS).

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

## Build

```bash
npm run build
```

Salida en `dist/azenda`.

## Mapa de rutas (demo)

| Ruta | Descripción |
|------|-------------|
| `/` | Landing de ventas |
| `/auth/iniciar-sesion` | Login simulado |
| `/auth/registro` | Registro simulado |
| `/app/...` | Panel cliente (requiere sesión tenant; guard) |
| `/super/...` | Super Admin (requiere rol simulado; guard) |
| `/reservar/:slug` | Reserva pública (wizard simulado) |

### Simulación completa (misma pestaña)

Todo comparte **`MockDataService`**: lo que haces en Super Admin, panel, ventas con stock, inventario, etc. se refleja al instante. **No hay persistencia**: al recargar la página se pierde (salvo que vuelvas al estado inicial con el botón de la landing).

- **Restablecer demo**: en la franja superior de la landing, **“Restablecer demo”** (cierra sesión y vuelve datos y catálogo al estado inicial).
- **Sincronía tenant**: si editas módulos o nombre de un tenant en **Super Admin → Tenants**, al tener abierto el panel con ese mismo `tenant_id`, el menú lateral se actualiza solo (efecto en `TenantShell`).
- **Registro**: crea un tenant nuevo en memoria y entra al panel como su admin.

### Login de demostración

- **`super`** → Super Admin.
- **`spa`** → Spa Relax (sin módulo inventario en el mock inicial).
- **`clinica`** o **`trial`** → Clínica Demo (tenant **pausado**: verás aviso en el panel).
- **`empleado`** → empleado en Barbería Centro.
- Cualquier otro correo válido → admin de **Barbería Centro**.

Desde la landing: accesos rápidos “Panel cliente” y “Super Admin”.

## Documentación backend

Ver [`docs/BACKEND.md`](docs/BACKEND.md) para endpoints sugeridos, multi-tenant y reglas de negocio pendientes.
