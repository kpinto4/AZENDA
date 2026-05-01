/** DDL inicial para modo SQLite (USE_SQLITE=1). Equivalente funcional al esquema MySQL. */
export const SQLITE_INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'Trial',
  storefront_enabled INTEGER NOT NULL DEFAULT 0,
  manual_booking_enabled INTEGER NOT NULL DEFAULT 1,
  citas_enabled INTEGER NOT NULL DEFAULT 1,
  ventas_enabled INTEGER NOT NULL DEFAULT 1,
  inventario_enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  tenant_id TEXT,
  systems TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer TEXT NOT NULL,
  service TEXT NOT NULL,
  when_at TEXT NOT NULL,
  status TEXT NOT NULL,
  attendance TEXT NOT NULL DEFAULT 'PENDIENTE',
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_when
  ON appointments(tenant_id, when_at);

CREATE TABLE IF NOT EXISTS store_visit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_visits_tenant_created
  ON store_visit_logs(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  catalog_layout TEXT NOT NULL DEFAULT 'horizontal',
  primary_color TEXT NOT NULL DEFAULT '#4f46e5',
  accent_color TEXT NOT NULL DEFAULT '#06b6d4',
  bg_color TEXT NOT NULL DEFAULT '#f8fafc',
  surface_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#0f172a',
  border_radius_px INTEGER NOT NULL DEFAULT 12,
  use_gradient INTEGER NOT NULL DEFAULT 0,
  gradient_from TEXT NOT NULL DEFAULT '#4f46e5',
  gradient_to TEXT NOT NULL DEFAULT '#06b6d4',
  gradient_angle_deg INTEGER NOT NULL DEFAULT 135,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  promo_price REAL,
  sku TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  catalog_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_products_tenant_order
  ON tenant_products(tenant_id, catalog_order);

CREATE TABLE IF NOT EXISTS tenant_services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  promo_price REAL,
  promo_label TEXT,
  catalog_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_services_tenant_order
  ON tenant_services(tenant_id, catalog_order);
`;
