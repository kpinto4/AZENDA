# Estructura Frontend (independiente y mantenible)

## Regla principal
Organizar por feature/pagina. Cada feature expone sus paginas desde `pages/*/*.page.ts`.

## Mapa de carpetas
- `core/`: cross-cutting (guards, interceptors, servicios globales, utilidades comunes).
- `layout/`: shells de navegacion (`tenant-shell`, `super-shell`).
- `features/<feature>/pages/`: entradas de rutas por pagina (punto publico de la feature).
- `features/<feature>/*.component.*`: implementacion actual de UI (migracion incremental).

## Contratos de independencia
1. Una feature no importa archivos internos de otra feature.
2. La comunicacion entre features se hace via rutas, servicios de `core` o APIs tipadas.
3. Los `*.page.ts` son el unico punto que `app.routes.ts` debe importar para paginas.
4. Componentes reutilizables se promueven a `shared/` (cuando existan 2+ usos reales).

## Siguiente fase recomendada
- Mover internamente cada feature a:
  - `components/`
  - `application/` (casos de uso/fachadas)
  - `infrastructure/` (api adapters)
  - `models/`
- Mantener `pages/` como capa de entrada y composicion.
