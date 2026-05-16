# Migraciones PostgreSQL (`api/migrations`)

**Estado Fase 2 (mayo 2026):** el esquema se sigue garantizando de forma **idempotente** al arrancar la API (`SqlDbService.createSchema`, `ensureSchemaMigrations`). Eso permite pilotos sin un runner de migraciones externo.

**Objetivo de esta carpeta:** versionar cambios DDL/DML grandes (alineados con releases) cuando el equipo pase de migraciones implícitas a un flujo explícito (p. ej. script CI o herramienta tipo `node-pg-migrate`). Hasta entonces:

- Convención sugerida: `YYYYMMDD_descripcion.sql` ejecutadas en orden sobre Neon (staging antes que prod).
- No dupliques lógica en runtime y en archivo sin revisar impacto en arranques con bases ya existentes.

Ver también `BACKEND.md` / `docs/PLAN_MEJORAS_FASES.md`.
