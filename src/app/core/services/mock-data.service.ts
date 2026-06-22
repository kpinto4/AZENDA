import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { formatCop } from '../format-currency';
import { publicCustomerNameMatches } from '../customer-name-match';
import { tenantBrandingCssVars as brandingCssVarsFromUtil } from '../tenant-branding-css';
import type { PromoScheduleType } from '../promo-schedule.util';
import type { ApiTenantDto } from './api-tenants-admin.service';

const PRODUCTS_LS_KEY = 'azenda.mock.products.v1';
const TENANT_CUSTOMIZATION_LS_KEY = 'azenda.mock.tenant.customization.v1';

export interface TenantBranding {
  displayName: string;
  logoUrl: string | null;
  publicAddress: string | null;
  publicMapsUrl: string | null;
  cancellationPolicy: string | null;
  reminderNotice: string | null;
  whatsappPhoneE164: string | null;
  whatsappDefaultMessage: string | null;
  publicBookingHoursJson: string | null;
  reviewsUrl: string | null;
  posPaymentMethodsJson: string;
  catalogLayout: 'horizontal' | 'grid';
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  borderRadiusPx: number;
  useGradient: boolean;
  gradientFrom: string;
  gradientTo: string;
  gradientAngleDeg: number;
}

type TenantBrandingPatch = Partial<TenantBranding>;

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
        price: Math.max(0, Number(o['price']) || 0),
        promoPrice:
          o['promoPrice'] == null ? null : Math.max(0, Number(o['promoPrice']) || 0),
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

function parseCustomizationMapFromString(raw: string): Record<string, TenantBrandingPatch> | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    return data as Record<string, TenantBrandingPatch>;
  } catch {
    return null;
  }
}

function loadTenantCustomizationMap(): Record<string, TenantBrandingPatch> {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  const raw = localStorage.getItem(TENANT_CUSTOMIZATION_LS_KEY);
  if (!raw) {
    return {};
  }
  return parseCustomizationMapFromString(raw) ?? {};
}

export type TenantModuleKey = 'citas' | 'ventas' | 'inventario';

export interface MockBusinessService {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  promoEnabled?: boolean;
  promoScheduleType?: PromoScheduleType | null;
  promoDays?: number[];
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  promoLabel?: string | null;
  durationMinutes?: number;
}

export interface MockTenant {
  id: string;
  name: string;
  /** Slug de la URL pública de reservas: `/reservar/:slug` (único por negocio). */
  bookingSlug: string;
  /** Id del tenant en el API del backend, si existe. */
  apiTenantId?: string;
  plan: string;
  /** Catálogo público (planes Pro+); en API viene de `storefrontEnabled`. */
  storefrontEnabled?: boolean;
  /** Si está activo, el negocio permite crear citas manualmente desde el panel. */
  manualBookingEnabled?: boolean;
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
  /** Solo API: recordatorio manual por WhatsApp marcado como enviado. */
  waReminderSentAt?: string | null;
  waReminderConsent?: boolean;
  /** Solo API: móvil del cliente (wa.me). */
  customerPhoneE164?: string | null;
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
  description?: string | null;
  price: number;
  promoPrice?: number | null;
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
  email: string;
  panelRole: 'ADMIN' | 'EMPLEADO';
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

function clampBorderRadius(v: number | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return 12;
  }
  return Math.min(28, Math.max(4, Math.round(n)));
}

function clampGradientAngle(v: number | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return 135;
  }
  return Math.min(360, Math.max(0, Math.round(n)));
}

function mixWithBlack(hex: string, amount: number): string {
  const safe = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return hex;
  }
  const n = Number.parseInt(safe, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const k = Math.min(1, Math.max(0, amount));
  const rr = Math.round(r * (1 - k));
  const gg = Math.round(g * (1 - k));
  const bb = Math.round(b * (1 - k));
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const safe = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return hex;
  }
  const n = Number.parseInt(safe, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const k = Math.min(1, Math.max(0, amount));
  const rr = Math.round(r + (255 - r) * k);
  const gg = Math.round(g + (255 - g) * k);
  const bb = Math.round(b + (255 - b) * k);
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

function defaultTenantBranding(name: string): TenantBranding {
  return {
    displayName: name,
    logoUrl: null,
    publicAddress: null,
    publicMapsUrl: null,
    cancellationPolicy: null,
    reminderNotice: null,
    whatsappPhoneE164: null,
    whatsappDefaultMessage: null,
    publicBookingHoursJson: null,
    reviewsUrl: null,
    posPaymentMethodsJson: JSON.stringify([
      { id: 'efectivo', label: 'Efectivo', enabled: true, detail: '' },
      { id: 'tarjeta', label: 'Tarjeta / datáfono', enabled: true, detail: '' },
      { id: 'transferencia', label: 'Transferencia', enabled: false, detail: '' },
      { id: 'nequi', label: 'Nequi', enabled: false, detail: '' },
      { id: 'daviplata', label: 'Daviplata', enabled: false, detail: '' },
    ]),
    catalogLayout: 'horizontal',
    primaryColor: '#4f46e5',
    accentColor: '#06b6d4',
    bgColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#0f172a',
    borderRadiusPx: 12,
    useGradient: false,
    gradientFrom: '#4f46e5',
    gradientTo: '#06b6d4',
    gradientAngleDeg: 135,
  };
}

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
      manualBookingEnabled: true,
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
      manualBookingEnabled: true,
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
      manualBookingEnabled: true,
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
      description: 'Uso diario para limpieza profunda.',
      price: 12,
      promoPrice: null,
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
      description: 'Fijación media con acabado natural.',
      price: 9,
      promoPrice: 7.5,
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
      description: 'Pack higiénico para servicio rápido.',
      price: 6,
      promoPrice: null,
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
    { id: 'e1', name: 'Carlos Ruiz', email: 'carlos@barberia.demo', panelRole: 'EMPLEADO' },
    { id: 'e2', name: 'Laura Sánchez', email: 'laura@barberia.demo', panelRole: 'ADMIN' },
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
function inferMockServiceDurationMinutes(name: string): number {
  const m = /(\d{2,3})\s*min/i.exec(name.trim());
  if (m) {
    const n = Number(m[1]);
    if (n >= 5 && n <= 480) {
      return n;
    }
  }
  return 30;
}

function svc(name: string, extra: Omit<MockBusinessService, 'id' | 'name' | 'durationMinutes'> & { id: string }): MockBusinessService {
  return {
    ...extra,
    name,
    durationMinutes: inferMockServiceDurationMinutes(name),
  };
}

/** Catálogo inicial de servicios por slug de reserva (cada negocio distinto). */
function initialTenantServiceCatalogs(): Record<string, MockBusinessService[]> {
  return {
    'barberia-centro': [
      svc('Corte clásico', { id: 'svc-b-1', description: 'Corte tradicional con acabado limpio.', price: 15, promoPrice: null, promoLabel: null }),
      svc('Corte degradado / fade', { id: 'svc-b-2', description: 'Degradado progresivo personalizado.', price: 18, promoPrice: 16, promoLabel: 'Promo tarde' }),
      svc('Corte + barba', { id: 'svc-b-3', price: 24, promoPrice: null, promoLabel: null }),
      svc('Arreglo de barba', { id: 'svc-b-4', price: 12, promoPrice: null, promoLabel: null }),
      svc('Peinado evento', { id: 'svc-b-5', price: 20, promoPrice: null, promoLabel: null }),
    ],
    'spa-relax': [
      svc('Masaje relajante 60 min', {
        id: 'svc-s-1',
        description: 'Sesión de relajación corporal integral.',
        price: 45,
        promoEnabled: true,
        promoPrice: 39,
        promoScheduleType: 'weekdays',
        promoDays: [1, 2, 3, 4],
        promoLabel: 'Lun, Mar, Mié, Jue',
      }),
      svc('Masaje descontracturante', { id: 'svc-s-2', price: 50, promoPrice: null, promoLabel: null }),
      svc('Facial hidratante', { id: 'svc-s-3', description: 'Limpieza e hidratación profunda facial.', price: 38, promoPrice: null, promoLabel: null }),
      svc('Circuito spa 90 min', { id: 'svc-s-4', price: 65, promoPrice: 58, promoLabel: 'Pack bienestar' }),
      svc('Envoltura corporal', { id: 'svc-s-5', price: 42, promoPrice: null, promoLabel: null }),
    ],
    'clinica-demo': [
      svc('Consulta primera visita', { id: 'svc-c-1', description: 'Evaluación inicial del caso y plan.', price: 55, promoPrice: null, promoLabel: null }),
      svc('Control / seguimiento', { id: 'svc-c-2', price: 40, promoPrice: null, promoLabel: null }),
      svc('Teleconsulta', { id: 'svc-c-3', price: 35, promoPrice: 30, promoLabel: 'Campaña digital' }),
      svc('Informe o certificado', { id: 'svc-c-4', price: 25, promoPrice: null, promoLabel: null }),
    ],
  };
}

/** Servicios por defecto al crear un negocio nuevo (según nombre). */
export function defaultServicesForNewTenant(businessName: string): MockBusinessService[] {
  const n = businessName.toLowerCase();
  if (n.includes('spa')) {
    return [
      { id: `svc-${Date.now()}-1`, name: 'Masaje 60 min', price: 45, promoPrice: null, promoLabel: null },
      { id: `svc-${Date.now()}-2`, name: 'Masaje 90 min', price: 60, promoPrice: null, promoLabel: null },
      { id: `svc-${Date.now()}-3`, name: 'Tratamiento facial', price: 38, promoPrice: null, promoLabel: null },
    ];
  }
  if (n.includes('clín') || n.includes('clin')) {
    return [
      { id: `svc-${Date.now()}-1`, name: 'Consulta general', price: 50, promoPrice: null, promoLabel: null },
      { id: `svc-${Date.now()}-2`, name: 'Control', price: 35, promoPrice: null, promoLabel: null },
      { id: `svc-${Date.now()}-3`, name: 'Teleconsulta', price: 30, promoPrice: null, promoLabel: null },
    ];
  }
  if (n.includes('barber') || n.includes('pelu')) {
    return [
      { id: `svc-${Date.now()}-1`, name: 'Corte caballero', price: 15, promoPrice: null, promoLabel: null },
      { id: `svc-${Date.now()}-2`, name: 'Corte + barba', price: 24, promoPrice: null, promoLabel: null },
      { id: `svc-${Date.now()}-3`, name: 'Arreglo de barba', price: 12, promoPrice: null, promoLabel: null },
    ];
  }
  return [
    { id: `svc-${Date.now()}-1`, name: 'Servicio principal', price: 30, promoPrice: null, promoLabel: null },
    { id: `svc-${Date.now()}-2`, name: 'Servicio adicional', price: 20, promoPrice: null, promoLabel: null },
  ];
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
  readonly tenantCustomizations = signal<Record<string, TenantBrandingPatch>>(
    loadTenantCustomizationMap(),
  );

  /** Servicios ofrecidos en reserva pública y citas, por `bookingSlug`. */
  readonly tenantServiceCatalogs = signal<Record<string, MockBusinessService[]>>(
    initialTenantServiceCatalogs(),
  );

  /** Registros “tienda” enviados desde el enlace público (solo mock). */
  readonly publicStoreVisits = signal<MockPublicStoreVisit[]>([]);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    const onStorage = (e: StorageEvent): void => {
      if (e.key === PRODUCTS_LS_KEY) {
        if (e.newValue === null) {
          this.ngZone.run(() => this.products.set(initialProducts()));
          return;
        }
        const parsedProducts = parseProductsFromJsonString(e.newValue);
        if (parsedProducts) {
          this.ngZone.run(() => this.products.set(parsedProducts));
        }
        return;
      }
      if (e.key === TENANT_CUSTOMIZATION_LS_KEY) {
        if (e.newValue === null) {
          this.ngZone.run(() => this.tenantCustomizations.set({}));
          return;
        }
        const parsedMap = parseCustomizationMapFromString(e.newValue);
        if (parsedMap) {
          this.ngZone.run(() => this.tenantCustomizations.set(parsedMap));
        }
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

  private persistTenantCustomizationMap(map: Record<string, TenantBrandingPatch>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(TENANT_CUSTOMIZATION_LS_KEY, JSON.stringify(map));
    } catch {
      /* quota u otro */
    }
  }

  tenantById(id: string): MockTenant | undefined {
    return this.tenants().find((t) => t.id === id);
  }

  tenantByBookingSlug(slug: string): MockTenant | undefined {
    const n = slug.trim().toLowerCase();
    return this.tenants().find((t) => t.bookingSlug.trim().toLowerCase() === n);
  }

  brandingForTenant(tenantId: string): TenantBranding {
    const tenant = this.tenantById(tenantId);
    const base = defaultTenantBranding(tenant?.name ?? 'Tu negocio');
    const patch = this.tenantCustomizations()[tenantId];
    return {
      ...base,
      ...patch,
      displayName: (patch?.displayName ?? base.displayName).trim() || base.displayName,
      logoUrl:
        patch?.logoUrl === undefined || patch.logoUrl === '' ? base.logoUrl : patch.logoUrl,
      publicAddress:
        patch?.publicAddress !== undefined ? patch.publicAddress : base.publicAddress,
      publicMapsUrl:
        patch?.publicMapsUrl !== undefined ? patch.publicMapsUrl : base.publicMapsUrl,
      cancellationPolicy:
        patch?.cancellationPolicy !== undefined ? patch.cancellationPolicy : base.cancellationPolicy,
      reminderNotice:
        patch?.reminderNotice !== undefined ? patch.reminderNotice : base.reminderNotice,
      whatsappPhoneE164:
        patch?.whatsappPhoneE164 !== undefined ? patch.whatsappPhoneE164 : base.whatsappPhoneE164,
      whatsappDefaultMessage:
        patch?.whatsappDefaultMessage !== undefined
          ? patch.whatsappDefaultMessage
          : base.whatsappDefaultMessage,
      publicBookingHoursJson:
        patch?.publicBookingHoursJson !== undefined
          ? patch.publicBookingHoursJson
          : base.publicBookingHoursJson,
      borderRadiusPx: clampBorderRadius(patch?.borderRadiusPx ?? base.borderRadiusPx),
      useGradient: !!(patch?.useGradient ?? base.useGradient),
      gradientFrom: patch?.gradientFrom ?? base.gradientFrom,
      gradientTo: patch?.gradientTo ?? base.gradientTo,
      gradientAngleDeg: clampGradientAngle(patch?.gradientAngleDeg ?? base.gradientAngleDeg),
    };
  }

  brandingForBookingSlug(slug: string): TenantBranding {
    const tenant = this.tenantByBookingSlug(slug);
    if (!tenant) {
      return defaultTenantBranding('Azenda');
    }
    return this.brandingForTenant(tenant.id);
  }

  brandingCssVars(branding: TenantBranding, darkMode = false): Record<string, string> {
    return brandingCssVarsFromUtil(branding, darkMode);
  }

  updateTenantBranding(tenantId: string, patch: TenantBrandingPatch): void {
    const cleaned: TenantBrandingPatch = { ...patch };
    if (cleaned.displayName !== undefined) {
      cleaned.displayName = cleaned.displayName.trim();
    }
    this.tenantCustomizations.update((map) => {
      const next = { ...map, [tenantId]: { ...(map[tenantId] ?? {}), ...cleaned } };
      this.persistTenantCustomizationMap(next);
      return next;
    });
  }

  /** Sincroniza branding desde respuesta del API (panel + enlace público). */
  applyBrandingFromApi(
    tenantId: string,
    b: {
      displayName: string;
      logoUrl: string | null;
      publicAddress?: string | null;
      publicMapsUrl?: string | null;
      cancellationPolicy?: string | null;
      reminderNotice?: string | null;
      whatsappPhoneE164?: string | null;
      whatsappDefaultMessage?: string | null;
      publicBookingHoursJson?: string | null;
      reviewsUrl?: string | null;
      posPaymentMethodsJson?: string;
      catalogLayout?: 'horizontal' | 'grid';
      primaryColor: string;
      accentColor: string;
      bgColor: string;
      surfaceColor: string;
      textColor: string;
      borderRadiusPx: number;
      useGradient: boolean;
      gradientFrom: string;
      gradientTo: string;
      gradientAngleDeg: number;
    },
  ): void {
    this.updateTenantBranding(tenantId, {
      displayName: b.displayName,
      logoUrl: b.logoUrl,
      publicAddress: b.publicAddress ?? null,
      publicMapsUrl: b.publicMapsUrl ?? null,
      cancellationPolicy: b.cancellationPolicy ?? null,
      reminderNotice: b.reminderNotice ?? null,
      whatsappPhoneE164: b.whatsappPhoneE164 ?? null,
      whatsappDefaultMessage: b.whatsappDefaultMessage ?? null,
      publicBookingHoursJson: b.publicBookingHoursJson ?? null,
      reviewsUrl: b.reviewsUrl ?? null,
      posPaymentMethodsJson: b.posPaymentMethodsJson,
      catalogLayout: b.catalogLayout,
      primaryColor: b.primaryColor,
      accentColor: b.accentColor,
      bgColor: b.bgColor,
      surfaceColor: b.surfaceColor,
      textColor: b.textColor,
      borderRadiusPx: b.borderRadiusPx,
      useGradient: b.useGradient,
      gradientFrom: b.gradientFrom,
      gradientTo: b.gradientTo,
      gradientAngleDeg: b.gradientAngleDeg,
    });
  }

  updateTenantName(tenantId: string, name: string): void {
    const clean = name.trim();
    if (!clean) {
      return;
    }
    this.tenants.update((list) => list.map((t) => (t.id === tenantId ? { ...t, name: clean } : t)));
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
                manualBookingEnabled: row.manualBookingEnabled ?? true,
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
        manualBookingEnabled: row.manualBookingEnabled ?? true,
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
    this.tenantCustomizations.set({});
    this.persistTenantCustomizationMap({});
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
      manualBookingEnabled: true,
      active: true,
      modules: ['citas'],
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
      manualBookingEnabled: true,
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    };
    this.tenants.update((list) => [...list, row]);
    this.ensureDefaultServicesForSlug(row.bookingSlug, nm);
  }

  /** Lista de servicios formateada para reserva pública / citas. */
  servicesForBookingSlug(slug: string): string[] {
    const cat = this.tenantServiceCatalogs()[slug];
    if (cat?.length) {
      return cat.map((s) => this.serviceDisplayLabel(s));
    }
    return ['Configura tus servicios en el menú Catálogo del panel.'];
  }

  listBusinessServicesForSlug(slug: string): MockBusinessService[] {
    return [...(this.tenantServiceCatalogs()[slug] ?? [])];
  }

  createBusinessService(
    slug: string,
    data: {
      name: string;
      description?: string | null;
      price: number;
      promoPrice?: number | null;
      promoLabel?: string | null;
      durationMinutes?: number;
    },
  ): void {
    const name = data.name.trim();
    if (!name) {
      return;
    }
    const price = Math.max(0, Number(data.price) || 0);
    const promoPrice =
      data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0);
    const promoLabel = data.promoLabel?.trim() || null;
    const row: MockBusinessService = {
      id: `svc_${Date.now()}`,
      name,
      description: data.description?.trim() || null,
      price,
      promoPrice,
      promoLabel,
      durationMinutes: Math.max(5, Math.min(480, Number(data.durationMinutes) || inferMockServiceDurationMinutes(name))),
    };
    this.tenantServiceCatalogs.update((m) => ({ ...m, [slug]: [...(m[slug] ?? []), row] }));
  }

  updateBusinessService(
    slug: string,
    serviceId: string,
    patch: {
      name: string;
      description?: string | null;
      price: number;
      promoPrice?: number | null;
      promoLabel?: string | null;
      durationMinutes?: number;
    },
  ): void {
    this.tenantServiceCatalogs.update((m) => ({
      ...m,
      [slug]: (m[slug] ?? []).map((s) =>
        s.id === serviceId
          ? {
              ...s,
              name: patch.name.trim(),
              description: patch.description?.trim() || null,
              price: Math.max(0, Number(patch.price) || 0),
              promoPrice:
                patch.promoPrice == null
                  ? null
                  : Math.max(0, Number(patch.promoPrice) || 0),
              promoLabel: patch.promoLabel?.trim() || null,
              durationMinutes: Math.max(
                5,
                Math.min(
                  480,
                  Number(patch.durationMinutes) || inferMockServiceDurationMinutes(patch.name),
                ),
              ),
            }
          : s,
      ),
    }));
  }

  deleteBusinessService(slug: string, serviceId: string): void {
    this.tenantServiceCatalogs.update((m) => ({
      ...m,
      [slug]: (m[slug] ?? []).filter((s) => s.id !== serviceId),
    }));
  }

  /** Compatibilidad con flujos antiguos de texto libre. */
  setServicesForBookingSlug(slug: string, serviceNames: string[]): void {
    const cleaned = serviceNames.map((s) => s.trim()).filter(Boolean);
    if (!cleaned.length) {
      return;
    }
    const next: MockBusinessService[] = cleaned.map((name, idx) => ({
      id: `svc_txt_${Date.now()}_${idx}`,
      name,
      description: null,
      price: 0,
      promoPrice: null,
      promoLabel: null,
    }));
    this.tenantServiceCatalogs.update((m) => ({ ...m, [slug]: next }));
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

  private serviceDisplayLabel(s: MockBusinessService): string {
    const desc = s.description?.trim() ? ` — ${s.description.trim()}` : '';
    const base = `${s.name}${desc} · ${formatCop(s.price)}`;
    if (s.promoPrice != null) {
      const promo = formatCop(Number(s.promoPrice));
      const tag = s.promoLabel ? ` (${s.promoLabel})` : '';
      return `${base} · Promo ${promo}${tag}`;
    }
    return base;
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

  setTenantManualBookingEnabled(id: string, enabled: boolean): void {
    this.tenants.update((list) =>
      list.map((t) => (t.id === id ? { ...t, manualBookingEnabled: enabled } : t)),
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
    const status =
      attendance === 'ASISTIO'
        ? 'confirmada'
        : attendance === 'NO_ASISTIO'
          ? 'cancelada'
          : row.status;
    this.appointments.update((list) => [{ id, ...row, status, attendance }, ...list]);
  }

  setAppointmentStatus(id: string, status: MockAppointment['status']): void {
    this.appointments.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  setAppointmentAttendance(id: string, attendance: MockAppointmentAttendance): void {
    this.appointments.update((list) =>
      list.map((a) =>
        a.id === id
          ? {
              ...a,
              attendance,
              status:
                attendance === 'ASISTIO'
                  ? 'confirmada'
                  : attendance === 'NO_ASISTIO'
                    ? 'cancelada'
                    : 'pendiente',
            }
          : a,
      ),
    );
  }

  /** Cliente confirma asistencia (mock): slug del negocio, id de cita y nombre igual al de la reserva. */
  confirmPublicAttendanceMock(slug: string, appointmentId: string, customer: string): boolean {
    let ok = false;
    this.appointments.update((list) =>
      list.map((a) => {
        if (
          a.id === appointmentId &&
          a.tenantSlug === slug &&
          publicCustomerNameMatches(a.customer, customer) &&
          a.status !== 'cancelada'
        ) {
          ok = true;
          return {
            ...a,
            attendance: 'ASISTIO' as MockAppointmentAttendance,
            status: 'confirmada' as MockAppointment['status'],
          };
        }
        return a;
      }),
    );
    return ok;
  }

  /** Busca citas activas (mock): solo referencia o móvil; nombre opcional para filtrar. */
  lookupPublicAppointmentsMock(
    slug: string,
    customer: string | undefined,
    appointmentId?: string,
    customerPhoneRaw?: string,
  ): {
    id: string;
    when: string;
    serviceLabel: string;
    customer: string;
    employeeId: string | null;
    status: MockAppointment['status'];
    attendance: MockAppointmentAttendance;
  }[] {
    const ref = appointmentId?.trim();
    const phoneDigits = customerPhoneRaw?.trim()
      ? this.normalizePhoneDigitsForBookingMock(customerPhoneRaw)
      : null;
    if (!ref && !phoneDigits) {
      return [];
    }
    const nameFilter = (customer ?? '').trim();
    const list = this.appointments().filter((a) => {
      if (a.tenantSlug !== slug || a.status === 'cancelada' || a.attendance !== 'PENDIENTE') {
        return false;
      }
      if (!nameFilter) {
        return true;
      }
      return publicCustomerNameMatches(a.customer, nameFilter);
    });
    let matched = list;
    if (ref) {
      matched = list.filter((a) => a.id === ref);
    } else if (phoneDigits) {
      matched = list.filter((a) => (a.customerPhoneE164 ?? '') === phoneDigits);
    }
    return matched.map((a) => ({
      id: a.id,
      when: a.when,
      serviceLabel: this.publicServiceLabelFromBookingService(a.service),
      customer: a.customer,
      employeeId: this.readEmployeeIdFromMockService(a.service),
      status: a.status,
      attendance: a.attendance ?? 'PENDIENTE',
    }));
  }

  private publicServiceLabelFromBookingService(service: string): string {
    const marker = '· Empleado';
    const idx = service.indexOf(marker);
    return idx >= 0 ? service.slice(0, idx).trim() : service.trim();
  }

  private readEmployeeIdFromMockService(service: string): string | null {
    const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(service);
    return m?.[1] ?? null;
  }

  private mockAppointmentStartMs(when: string): number | null {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
    if (!m) {
      return null;
    }
    const hh = m[2].padStart(2, '0');
    const d = new Date(`${m[1]}T${hh}:${m[3]}:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  /** Aproximación demo al E.164 en dígitos (Colombia: 57 + 10 dígitos). */
  private normalizePhoneDigitsForBookingMock(raw: string): string | null {
    let d = raw.replace(/\D/g, '');
    if (!d) {
      return null;
    }
    if (d.startsWith('00')) {
      d = d.slice(2);
    }
    if (d.startsWith('57') && d.length === 12) {
      d = d.slice(2);
    }
    if (!/^3\d{9}$/.test(d)) {
      return null;
    }
    return `57${d}`;
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
    customerPhoneRaw?: string | null,
  ): boolean {
    const occupied = this
      .appointments()
      .some(
        (a) =>
          a.tenantSlug === bookingSlug &&
          a.when.trim() === when.trim() &&
          a.status !== 'cancelada',
      );
    if (occupied) {
      return false;
    }
    const phoneDigits = customerPhoneRaw?.trim()
      ? this.normalizePhoneDigitsForBookingMock(customerPhoneRaw)
      : null;
    this.addAppointment({
      customer,
      service,
      when,
      status: 'pendiente',
      attendance: 'PENDIENTE',
      tenantSlug: bookingSlug,
      customerPhoneE164: phoneDigits,
      waReminderConsent: !!phoneDigits,
    });
    return true;
  }

  /** Cambia fecha/hora de una cita mock; valida nombre, antelación 90 min y hueco libre. `serviceDisplay` opcional. */
  reschedulePublicBookingMock(
    bookingSlug: string,
    appointmentId: string,
    customerName: string,
    newWhen: string,
    serviceDisplay?: string,
  ): boolean {
    let updated = false;
    this.appointments.update((cur) => {
      const idx = cur.findIndex((a) => a.id === appointmentId && a.tenantSlug === bookingSlug);
      if (idx < 0) {
        return cur;
      }
      const a = cur[idx];
      const oldMs = this.mockAppointmentStartMs(a.when);
      if (oldMs != null && oldMs - Date.now() < 90 * 60 * 1000) {
        return cur;
      }
      if (!publicCustomerNameMatches(a.customer, customerName)) {
        return cur;
      }
      if (a.status === 'cancelada' || a.attendance !== 'PENDIENTE') {
        return cur;
      }
      const conflict = cur.some(
        (x) =>
          x.tenantSlug === bookingSlug &&
          x.when.trim() === newWhen.trim() &&
          x.status !== 'cancelada' &&
          x.id !== appointmentId,
      );
      if (conflict) {
        return cur;
      }
      updated = true;
      const next = [...cur];
      next[idx] = { ...a, when: newWhen.trim(), service: serviceDisplay ?? a.service };
      return next;
    });
    return updated;
  }

  addEmployee(name: string, email: string, panelRole: 'ADMIN' | 'EMPLEADO'): void {
    const id = `e${Date.now()}`;
    this.employees.update((list) => [
      ...list,
      { id, name: name.trim(), email: email.trim().toLowerCase(), panelRole },
    ]);
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
    input: {
      name: string;
      description?: string | null;
      price: number;
      promoPrice?: number | null;
      sku: string;
      stock: number;
      imageUrl?: string | null;
    },
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
      description: input.description?.trim() || null,
      price: Math.max(0, Number(input.price) || 0),
      promoPrice: input.promoPrice == null ? null : Math.max(0, Number(input.promoPrice) || 0),
      sku: input.sku.trim(),
      stock,
      lowStock: stock < LOW_STOCK_BELOW,
      catalogOrder: nextOrder,
      imageUrl: input.imageUrl ?? null,
    };
    this.mutateProducts((list) => [...list, row]);
    return id;
  }

  updateProduct(
    tenantId: string,
    productId: string,
    patch: {
      name: string;
      description?: string | null;
      price: number;
      promoPrice?: number | null;
      sku: string;
      stock: number;
      imageUrl?: string | null;
    },
  ): void {
    this.mutateProducts((list) =>
      list.map((p) => {
        if (p.id !== productId || p.tenantId !== tenantId) {
          return p;
        }
        const stock = Math.max(0, Math.floor(Number(patch.stock)) || 0);
        return {
          ...p,
          name: patch.name.trim(),
          description: patch.description?.trim() || null,
          price: Math.max(0, Number(patch.price) || 0),
          promoPrice:
            patch.promoPrice == null ? null : Math.max(0, Number(patch.promoPrice) || 0),
          sku: patch.sku.trim(),
          stock,
          lowStock: stock < LOW_STOCK_BELOW,
          imageUrl: patch.imageUrl ?? null,
        };
      }),
    );
  }

  deleteProduct(tenantId: string, productId: string): void {
    this.mutateProducts((list) =>
      list.filter((p) => !(p.id === productId && p.tenantId === tenantId)),
    );
    this.stockMovements.update((m) => m.filter((row) => row.productId !== productId));
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

  moveBusinessService(slug: string, serviceId: string, direction: -1 | 1): void {
    this.tenantServiceCatalogs.update((m) => {
      const list = [...(m[slug] ?? [])];
      const idx = list.findIndex((s) => s.id === serviceId);
      const j = idx + direction;
      if (idx < 0 || j < 0 || j >= list.length) {
        return m;
      }
      const tmp = list[idx];
      list[idx] = list[j];
      list[j] = tmp;
      return { ...m, [slug]: list };
    });
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
