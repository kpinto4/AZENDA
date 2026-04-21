import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import type { ApiTenantDto } from './api-tenants-admin.service';

const PRODUCTS_LS_KEY = 'azenda.mock.products.v1';

function parseProductsFromJsonString(raw: string): MockProduct[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    const out: MockProduct[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const o = item as Record<string, unknown>;
      if (typeof o['id'] !== 'string' || typeof o['tenantId'] !== 'string') {
        return null;
      }
      const stock = Math.max(0, Math.floor(Number(o['stock'])) || 0);
      out.push({
        id: o['id'],
        tenantId: o['tenantId'],
        name: String(o['name'] ?? '').trim() || 'Producto',
        sku: String(o['sku'] ?? '').trim() || '—',
        stock,
        lowStock: typeof o['lowStock'] === 'boolean' ? o['lowStock'] : stock < 5,
        catalogOrder: Number.isFinite(Number(o['catalogOrder']))
          ? Number(o['catalogOrder'])
          : 0,
        imageUrl:
          o['imageUrl'] == null || o['imageUrl'] === '' ? null : String(o['imageUrl']),
      });
    }
    return out;
  } catch {
    return null;
  }
}

function loadProductsFromStorage(): MockProduct[] | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(PRODUCTS_LS_KEY);
  if (!raw) {
    return null;
  }
  return parseProductsFromJsonString(raw);
}

export type TenantModuleKey = 'citas' | 'ventas' | 'inventario';

export interface MockTenant {
  id: string;
  name: string;
  /** Slug de la URL pública de reservas: `/reservar/:slug` (único por negocio). */
  bookingSlug: string;
  /** Id del tenant en el API (SQLite), si existe. */
  apiTenantId?: string;
  plan: string;
  /** Catálogo público (planes Pro+); en API viene de `storefrontEnabled`. */
  storefrontEnabled?: boolean;
  active: boolean;
  modules: TenantModuleKey[];
}

export type MockAppointmentAttendance = 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';

export interface MockAppointment {
  id: string;
  customer: string;
  service: string;
  when: string;
  status: 'confirmada' | 'pendiente' | 'cancelada';
  attendance?: MockAppointmentAttendance;
  /** Negocio al que pertenece la cita (reservas públicas / panel tenant). */
  tenantSlug?: string;
}

export interface MockPublicStoreVisit {
  id: string;
  tenantSlug: string;
  customer: string;
  detail: string;
  createdAt: string;
}

export interface MockSale {
  id: string;
  date: string;
  total: number;
  method: string;
  linkedAppointment?: string;
  stockNote?: string;
}

export interface MockProduct {
  id: string;
  /** Id del tenant mock (`t1`…) dueño del producto. */
  tenantId: string;
  name: string;
  sku: string;
  stock: number;
  lowStock: boolean;
  /** Orden en el catálogo público (menor = primero). */
  catalogOrder: number;
  /** Miniatura (p. ej. data URL) para el catálogo público. */
  imageUrl?: string | null;
}

export interface MockEmployee {
  id: string;
  name: string;
  role: string;
  services: string[];
}

export interface MockStockMovement {
  id: string;
  at: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
}

export interface MockPlatformUser {
  id: string;
  email: string;
  role: string;
  tenantLabel: string;
}

export interface MockCatalogModule {
  key: TenantModuleKey;
  name: string;
  desc: string;
  enabled: boolean;
}

const LOW_STOCK_BELOW = 5;

/** Genera un slug único para `/reservar/:slug` a partir del nombre y el id del tenant. */
export function deriveBookingSlug(name: string, tenantId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  const safeBase = base.length ? base : 'negocio';
  const suffix = tenantId.replace(/^t/, '') || tenantId;
  return `${safeBase}-${suffix}`;
}

function initialTenants(): MockTenant[] {
  return [
    {
      id: 't1',
      name: 'Barbería Centro',
      bookingSlug: 'barberia-centro',
      apiTenantId: 'tenant_barberia',
      plan: 'Pro',
      storefrontEnabled: true,
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    },
    {
      id: 't2',
      name: 'Spa Relax',
      bookingSlug: 'spa-relax',
      apiTenantId: 'tenant_spa',
      plan: 'Básico',
      storefrontEnabled: false,
      active: true,
      modules: ['citas', 'ventas'],
    },
    {
      id: 't3',
      name: 'Clínica Demo',
      bookingSlug: 'clinica-demo',
      apiTenantId: 'tenant_clinica',
      plan: 'Trial',
      storefrontEnabled: false,
      active: false,
      modules: ['citas'],
    },
  ];
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lunes de la semana local que contiene `ref` (medianoche). */
function mondayOfWeekContaining(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(12, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function initialAppointments(): MockAppointment[] {
  const mon = mondayOfWeekContaining(new Date());
  const tue = new Date(mon);
  tue.setDate(mon.getDate() + 1);
  return [
    {
      id: 'a1',
      customer: 'Ana G.',
      service: 'Corte + barba',
      when: `${ymdLocal(mon)} 10:00`,
      status: 'confirmada',
      attendance: 'PENDIENTE',
      tenantSlug: 'barberia-centro',
    },
    {
      id: 'a2',
      customer: 'Luis M.',
      service: 'Corte clásico',
      when: `${ymdLocal(mon)} 11:30`,
      status: 'pendiente',
      attendance: 'PENDIENTE',
      tenantSlug: 'barberia-centro',
    },
    {
      id: 'a3',
      customer: 'Elena R.',
      service: 'Tinte',
      when: `${ymdLocal(tue)} 09:00`,
      status: 'confirmada',
      attendance: 'PENDIENTE',
      tenantSlug: 'barberia-centro',
    },
  ];
}

function initialSales(): MockSale[] {
  return [
    { id: 's1', date: '2026-04-05', total: 35, method: 'Tarjeta', linkedAppointment: 'a1' },
    { id: 's2', date: '2026-04-05', total: 18, method: 'Efectivo' },
    { id: 's3', date: '2026-04-04', total: 52, method: 'Bizum' },
  ];
}

function initialProducts(): MockProduct[] {
  return [
    {
      id: 'p1',
      tenantId: 't1',
      name: 'Champú profesional',
      sku: 'SKU-001',
      stock: 24,
      lowStock: false,
      catalogOrder: 0,
      imageUrl: null,
    },
    {
      id: 'p2',
      tenantId: 't1',
      name: 'Cera mate',
      sku: 'SKU-014',
      stock: 4,
      lowStock: true,
      catalogOrder: 1,
      imageUrl: null,
    },
    {
      id: 'p3',
      tenantId: 't1',
      name: 'Toallas desechables',
      sku: 'SKU-022',
      stock: 120,
      lowStock: false,
      catalogOrder: 2,
      imageUrl: null,
    },
  ];
}

function initialEmployees(): MockEmployee[] {
  return [
    { id: 'e1', name: 'Carlos Ruiz', role: 'Barbero', services: ['Corte', 'Barba'] },
    { id: 'e2', name: 'Laura Sánchez', role: 'Colorista', services: ['Tinte', 'Mechas'] },
  ];
}

function initialStockMovements(): MockStockMovement[] {
  return [
    {
      id: 'm0',
      at: '2026-04-01 09:00',
      productId: 'p1',
      productName: 'Champú profesional',
      delta: 12,
      reason: 'Entrada inicial simulada',
    },
  ];
}

function initialPlatformUsers(): MockPlatformUser[] {
  return [
    { id: 'u1', email: 'super@azenda.app', role: 'SUPER_ADMIN', tenantLabel: '—' },
    { id: 'u2', email: 'admin@barberia.demo', role: 'ADMIN', tenantLabel: 'Barbería Centro' },
    { id: 'u3', email: 'emp@barberia.demo', role: 'EMPLEADO', tenantLabel: 'Barbería Centro' },
    { id: 'u4', email: 'admin@spa.demo', role: 'ADMIN', tenantLabel: 'Spa Relax' },
  ];
}

function initialCatalog(): MockCatalogModule[] {
  return [
    {
      key: 'citas',
      name: 'Citas',
      desc: 'Agenda, reservas públicas y empleados.',
      enabled: true,
    },
    {
      key: 'ventas',
      name: 'Ventas',
      desc: 'POS, métodos de pago e historial.',
      enabled: true,
    },
    {
      key: 'inventario',
      name: 'Inventario',
      desc: 'Stock, movimientos y alertas.',
      enabled: true,
    },
  ];
}

/** Catálogo inicial de servicios por slug de reserva (cada negocio distinto). */
function initialTenantServiceCatalogs(): Record<string, string[]> {
  return {
    'barberia-centro': [
      'Corte clásico',
      'Corte degradado / fade',
      'Corte + barba',
      'Arreglo de barba',
      'Peinado evento',
    ],
    'spa-relax': [
      'Masaje relajante 60 min',
      'Masaje descontracturante',
      'Facial hidratante',
      'Circuito spa 90 min',
      'Envoltura corporal',
    ],
    'clinica-demo': [
      'Consulta primera visita',
      'Control / seguimiento',
      'Teleconsulta',
      'Informe o certificado',
    ],
  };
}

/** Servicios por defecto al crear un negocio nuevo (según nombre). */
export function defaultServicesForNewTenant(businessName: string): string[] {
  const n = businessName.toLowerCase();
  if (n.includes('spa')) {
    return ['Masaje 60 min', 'Masaje 90 min', 'Tratamiento facial'];
  }
  if (n.includes('clín') || n.includes('clin')) {
    return ['Consulta general', 'Control', 'Teleconsulta'];
  }
  if (n.includes('barber') || n.includes('pelu')) {
    return ['Corte caballero', 'Corte + barba', 'Arreglo de barba'];
  }
  return ['Servicio principal', 'Servicio adicional (edita en Configuración)'];
}

function modulesFromApiShape(m: {
  citas: boolean;
  ventas: boolean;
  inventario: boolean;
}): TenantModuleKey[] {
  const out: TenantModuleKey[] = [];
  if (m.citas) {
    out.push('citas');
  }
  if (m.ventas) {
    out.push('ventas');
  }
  if (m.inventario) {
    out.push('inventario');
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly apiTenantIdToMockId = signal<Record<string, string>>({
    tenant_barberia: 't1',
    tenant_spa: 't2',
    tenant_clinica: 't3',
  });

  readonly tenants = signal<MockTenant[]>(initialTenants());
  readonly appointments = signal<MockAppointment[]>(initialAppointments());
  readonly sales = signal<MockSale[]>(initialSales());
  readonly products = signal<MockProduct[]>(loadProductsFromStorage() ?? initialProducts());
  readonly employees = signal<MockEmployee[]>(initialEmployees());
  readonly stockMovements = signal<MockStockMovement[]>(initialStockMovements());
  readonly platformUsers = signal<MockPlatformUser[]>(initialPlatformUsers());
  readonly platformModuleCatalog = signal<MockCatalogModule[]>(initialCatalog());

  /** Servicios ofrecidos en reserva pública y citas, por `bookingSlug`. */
  readonly tenantServiceCatalogs = signal<Record<string, string[]>>(
    initialTenantServiceCatalogs(),
  );

  /** Registros “tienda” enviados desde el enlace público (solo mock). */
  readonly publicStoreVisits = signal<MockPublicStoreVisit[]>([]);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    const onStorage = (e: StorageEvent): void => {
      if (e.key !== PRODUCTS_LS_KEY) {
        return;
      }
      if (e.newValue === null) {
        this.ngZone.run(() => this.products.set(initialProducts()));
        return;
      }
      const parsed = parseProductsFromJsonString(e.newValue);
      if (parsed) {
        this.ngZone.run(() => this.products.set(parsed));
      }
    };
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  private persistProductsSnapshot(list: MockProduct[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(PRODUCTS_LS_KEY, JSON.stringify(list));
    } catch {
      /* quota u otro */
    }
  }

  private mutateProducts(mutator: (list: MockProduct[]) => MockProduct[]): void {
    this.products.update((list) => mutator(list));
    this.persistProductsSnapshot(this.products());
  }

  tenantById(id: string): MockTenant | undefined {
    return this.tenants().find((t) => t.id === id);
  }

  tenantByBookingSlug(slug: string): MockTenant | undefined {
    const n = slug.trim().toLowerCase();
    return this.tenants().find((t) => t.bookingSlug.trim().toLowerCase() === n);
  }

  /** Mock id (`t1`…) para un `tenantId` del API; incluye mapeos creados al sincronizar desde Super Admin. */
  getMockTenantIdForApi(apiTenantId: string | null): string | undefined {
    if (!apiTenantId) {
      return undefined;
    }
    return this.apiTenantIdToMockId()[apiTenantId];
  }

  /** Sincroniza filas del API al mock local (nombre, slug, módulos, estado) y mantiene el mapa API→mock. */
  syncTenantsFromApi(rows: ApiTenantDto[]): void {
    for (const row of rows) {
      this.upsertTenantFromApiRow(row);
    }
  }

  private upsertTenantFromApiRow(row: ApiTenantDto): void {
    const modules = modulesFromApiShape(row.modules);
    const active = row.status === 'ACTIVE';
    const existingMockId = this.getMockTenantIdForApi(row.id);

    if (existingMockId) {
      this.tenants.update((list) =>
        list.map((t) =>
          t.id === existingMockId
            ? {
                ...t,
                name: row.name,
                bookingSlug: row.slug,
                apiTenantId: row.id,
                plan: row.plan ?? t.plan,
                storefrontEnabled: row.storefrontEnabled,
                active,
                modules,
              }
            : t,
        ),
      );
      this.ensureDefaultServicesForSlug(row.slug, row.name);
      return;
    }

    const newMockId = `t_api_${row.id.replace(/[^a-z0-9]+/gi, '_')}`;
    this.apiTenantIdToMockId.update((m) => ({ ...m, [row.id]: newMockId }));
    this.tenants.update((list) => [
      ...list,
      {
        id: newMockId,
        name: row.name,
        bookingSlug: row.slug,
        apiTenantId: row.id,
        plan: row.plan ?? 'Trial',
        storefrontEnabled: row.storefrontEnabled,
        active,
        modules: modules.length ? modules : ['citas'],
      },
    ]);
    this.ensureDefaultServicesForSlug(row.slug, row.name);
  }

  /** Citas asociadas al slug de reserva del negocio (o todas si no hay slug). */
  appointmentsForBookingSlug(slug: string | null): MockAppointment[] {
    const list = this.appointments();
    if (!slug) {
      return list;
    }
    return list.filter((a) => a.tenantSlug === slug);
  }

  /** Vuelve todos los datos mock al estado inicial (solo memoria). */
  resetDemo(): void {
    this.apiTenantIdToMockId.set({
      tenant_barberia: 't1',
      tenant_spa: 't2',
      tenant_clinica: 't3',
    });
    this.tenantServiceCatalogs.set(initialTenantServiceCatalogs());
    this.tenants.set(initialTenants());
    this.appointments.set(initialAppointments());
    this.sales.set(initialSales());
    const freshProducts = initialProducts();
    this.products.set(freshProducts);
    this.persistProductsSnapshot(freshProducts);
    this.employees.set(initialEmployees());
    this.stockMovements.set(initialStockMovements());
    this.platformUsers.set(initialPlatformUsers());
    this.platformModuleCatalog.set(initialCatalog());
    this.publicStoreVisits.set([]);
  }

  registerNewTenant(businessName: string): MockTenant {
    const id = `t${Date.now()}`;
    const row: MockTenant = {
      id,
      name: businessName.trim(),
      bookingSlug: deriveBookingSlug(businessName.trim(), id),
      apiTenantId: undefined,
      plan: 'Trial',
      storefrontEnabled: false,
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    };
    this.tenants.update((list) => [...list, row]);
    this.ensureDefaultServicesForSlug(row.bookingSlug, row.name);
    return row;
  }

  addTenant(name: string, plan: string): void {
    const id = `t${Date.now()}`;
    const nm = name.trim();
    const row: MockTenant = {
      id,
      name: nm,
      bookingSlug: deriveBookingSlug(nm, id),
      apiTenantId: undefined,
      plan,
      storefrontEnabled: false,
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    };
    this.tenants.update((list) => [...list, row]);
    this.ensureDefaultServicesForSlug(row.bookingSlug, nm);
  }

  /** Lista de servicios del negocio para reserva pública / citas. */
  servicesForBookingSlug(slug: string): string[] {
    const cat = this.tenantServiceCatalogs()[slug];
    if (cat?.length) {
      return [...cat];
    }
    return ['Configura tus servicios en Panel → Configuración'];
  }

  /** Reemplaza el catálogo de servicios de un slug (una línea = un servicio en UI de ajustes). */
  setServicesForBookingSlug(slug: string, serviceNames: string[]): void {
    const cleaned = serviceNames.map((s) => s.trim()).filter(Boolean);
    if (!cleaned.length) {
      return;
    }
    this.tenantServiceCatalogs.update((m) => ({ ...m, [slug]: cleaned }));
  }

  /** Si no hay catálogo para el slug, crea uno por defecto según el nombre del negocio. */
  ensureDefaultServicesForSlug(slug: string, businessName: string): void {
    this.tenantServiceCatalogs.update((m) => {
      if (m[slug]?.length) {
        return m;
      }
      return { ...m, [slug]: defaultServicesForNewTenant(businessName) };
    });
  }

  setTenantActive(id: string, active: boolean): void {
    this.tenants.update((list) => list.map((t) => (t.id === id ? { ...t, active } : t)));
  }

  setTenantPlan(id: string, plan: string): void {
    this.tenants.update((list) => list.map((t) => (t.id === id ? { ...t, plan } : t)));
  }

  setTenantModule(id: string, key: TenantModuleKey, enabled: boolean): void {
    this.tenants.update((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const has = t.modules.includes(key);
        if (enabled && !has) {
          return { ...t, modules: [...t.modules, key] };
        }
        if (!enabled && has) {
          return { ...t, modules: t.modules.filter((m) => m !== key) };
        }
        return t;
      }),
    );
  }

  toggleCatalogModule(key: TenantModuleKey): void {
    this.platformModuleCatalog.update((list) =>
      list.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m)),
    );
  }

  addPlatformUser(email: string, role: string, tenantLabel: string): void {
    const id = `u${Date.now()}`;
    this.platformUsers.update((list) => [...list, { id, email: email.trim(), role, tenantLabel }]);
  }

  removePlatformUser(id: string): void {
    this.platformUsers.update((list) => list.filter((u) => u.id !== id));
  }

  addAppointment(row: Omit<MockAppointment, 'id'>): void {
    const id = `a${Date.now()}`;
    const attendance = row.attendance ?? 'PENDIENTE';
    this.appointments.update((list) => [{ id, ...row, attendance }, ...list]);
  }

  setAppointmentStatus(id: string, status: MockAppointment['status']): void {
    this.appointments.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  setAppointmentAttendance(id: string, attendance: MockAppointmentAttendance): void {
    this.appointments.update((list) =>
      list.map((a) => (a.id === id ? { ...a, attendance } : a)),
    );
  }

  /** Cliente confirma asistencia (mock): slug del negocio, id de cita y nombre igual al de la reserva. */
  confirmPublicAttendanceMock(slug: string, appointmentId: string, customer: string): boolean {
    const norm = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    const target = norm(customer);
    let ok = false;
    this.appointments.update((list) =>
      list.map((a) => {
        if (
          a.id === appointmentId &&
          a.tenantSlug === slug &&
          norm(a.customer) === target &&
          a.status !== 'cancelada'
        ) {
          ok = true;
          return { ...a, attendance: 'ASISTIO' as MockAppointmentAttendance };
        }
        return a;
      }),
    );
    return ok;
  }

  publicStoreVisitsForSlug(slug: string | null): MockPublicStoreVisit[] {
    if (!slug) {
      return [];
    }
    return this.publicStoreVisits().filter((v) => v.tenantSlug === slug);
  }

  addPublicStoreVisitMock(slug: string, customer: string, detail: string): void {
    const id = `v${Date.now()}`;
    const createdAt = new Date().toISOString();
    this.publicStoreVisits.update((list) => [
      { id, tenantSlug: slug, customer: customer.trim(), detail: detail.trim(), createdAt },
      ...list,
    ]);
  }

  addSale(
    row: Omit<MockSale, 'id' | 'stockNote'>,
    opts?: { productId?: string; stockQty?: number; tenantId?: string | null },
  ): void {
    const id = `s${Date.now()}`;
    let stockNote: string | undefined;
    const qty = opts?.stockQty ?? 1;
    if (opts?.productId) {
      const name = this.applyProductDelta(
        opts.productId,
        -qty,
        'Venta simulada',
        opts.tenantId ?? undefined,
      );
      if (name) {
        stockNote = `Stock: −${qty} · ${name}`;
      }
    }
    this.sales.update((list) => [{ id, ...row, stockNote }, ...list]);
  }

  recordBooking(
    customer: string,
    service: string,
    when: string,
    bookingSlug: string,
  ): void {
    this.addAppointment({
      customer,
      service,
      when,
      status: 'pendiente',
      attendance: 'PENDIENTE',
      tenantSlug: bookingSlug,
    });
  }

  addEmployee(name: string, role: string, servicesCsv: string): void {
    const id = `e${Date.now()}`;
    const services = servicesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.employees.update((list) => [...list, { id, name: name.trim(), role: role.trim(), services }]);
  }

  /** Productos de un tenant mock, ordenados para inventario / ventas. */
  productsForTenant(tenantId: string): MockProduct[] {
    return this.products()
      .filter((p) => p.tenantId === tenantId)
      .slice()
      .sort((a, b) => a.catalogOrder - b.catalogOrder || a.name.localeCompare(b.name));
  }

  /** Productos visibles en el catálogo público del slug (mismo orden que configuró el admin). */
  catalogProductsForBookingSlug(slug: string): MockProduct[] {
    const tenant = this.tenantByBookingSlug(slug);
    if (!tenant) {
      return [];
    }
    return this.productsForTenant(tenant.id);
  }

  addProduct(
    tenantId: string,
    input: { name: string; sku: string; stock: number; imageUrl?: string | null },
  ): string {
    const id = `p${Date.now()}`;
    const orders = this.products()
      .filter((p) => p.tenantId === tenantId)
      .map((p) => p.catalogOrder);
    const nextOrder = orders.length ? Math.max(...orders) + 1 : 0;
    const stock = Math.max(0, Math.floor(Number(input.stock)) || 0);
    const row: MockProduct = {
      id,
      tenantId,
      name: input.name.trim(),
      sku: input.sku.trim(),
      stock,
      lowStock: stock < LOW_STOCK_BELOW,
      catalogOrder: nextOrder,
      imageUrl: input.imageUrl ?? null,
    };
    this.mutateProducts((list) => [...list, row]);
    return id;
  }

  setProductImage(tenantId: string, productId: string, imageUrl: string | null): void {
    this.mutateProducts((list) =>
      list.map((p) =>
        p.id === productId && p.tenantId === tenantId ? { ...p, imageUrl: imageUrl || null } : p,
      ),
    );
  }

  moveCatalogProduct(tenantId: string, productId: string, direction: -1 | 1): void {
    const sorted = this.productsForTenant(tenantId);
    const idx = sorted.findIndex((p) => p.id === productId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    this.mutateProducts((list) =>
      list.map((p) => {
        if (p.id === a.id) {
          return { ...p, catalogOrder: b.catalogOrder };
        }
        if (p.id === b.id) {
          return { ...p, catalogOrder: a.catalogOrder };
        }
        return p;
      }),
    );
  }

  /** Movimiento manual de stock (entrada/salida simulada), solo si el producto pertenece al tenant. */
  applyStockMovement(
    tenantId: string | null,
    productId: string,
    delta: number,
    reason: string,
  ): void {
    this.applyProductDelta(productId, delta, reason, tenantId ?? undefined);
  }

  private applyProductDelta(
    productId: string,
    delta: number,
    reason: string,
    tenantId?: string,
  ): string | null {
    let label: string | null = null;
    this.mutateProducts((list) =>
      list.map((p) => {
        if (p.id !== productId) {
          return p;
        }
        if (tenantId !== undefined && p.tenantId !== tenantId) {
          return p;
        }
        label = p.name;
        const stock = Math.max(0, p.stock + delta);
        return { ...p, stock, lowStock: stock < LOW_STOCK_BELOW };
      }),
    );
    if (label) {
      const id = `m${Date.now()}`;
      const at = new Date().toISOString().slice(0, 16).replace('T', ' ');
      this.stockMovements.update((m) => [
        { id, at, productId, productName: label!, delta, reason },
        ...m,
      ]);
    }
    return label;
  }
}
