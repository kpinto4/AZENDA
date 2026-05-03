import { AppSystem, UserRole, UserStatus } from '../../auth/auth.types';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

/** Precios de lista globales por plan comercial (Trial, Básico, Pro, Negocio). */
export interface PlanCatalogEntry {
  planKey: string;
  priceMonthly: number;
  priceYearly: number;
}

export interface TenantBillingSnapshot {
  cycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewalAt: string;
  monthlyPrice: number;
  yearlyPrice: number;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  progressPct: number;
}

export interface TenantEntity {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
  /** Trial | Básico | Pro | Negocio (planes comerciales). */
  plan: string;
  /** Catálogo público tipo tienda (planes Pro+ y módulos ventas+inventario). */
  storefrontEnabled: boolean;
  /** Si está activo, el equipo puede crear citas manualmente desde el panel. */
  manualBookingEnabled: boolean;
  billingCycle: BillingCycle;
  planPriceMonthly: number;
  planPriceYearly: number;
  subscriptionStartedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewalAt: string;
  modules: {
    citas: boolean;
    ventas: boolean;
    inventario: boolean;
  };
}

export interface UserEntity {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  tenantId: string | null;
  systems: AppSystem[];
  status: UserStatus;
}

export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada';

/** Si la persona acudió a la cita (staff o confirmación pública del cliente). */
export type AppointmentAttendance = 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';

export interface AppointmentEntity {
  id: string;
  tenantId: string;
  customer: string;
  service: string;
  /** Fecha/hora en texto (misma convención que el front). */
  when: string;
  status: AppointmentStatus;
  attendance: AppointmentAttendance;
}

/** Registro enviado por clientes desde el enlace público (compra / recogida en tienda). */
export interface StoreVisitLogEntity {
  id: string;
  tenantId: string;
  customer: string;
  detail: string;
  createdAt: string;
}

export interface TenantBrandingEntity {
  tenantId: string;
  displayName: string;
  logoUrl: string | null;
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

export interface TenantProductEntity {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  promoPrice: number | null;
  sku: string;
  stock: number;
  catalogOrder: number;
  imageUrl: string | null;
}

export interface TenantServiceEntity {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  promoPrice: number | null;
  promoLabel: string | null;
  catalogOrder: number;
}

/** Textos de la landing y moneda global (Super Admin + lectura pública). */
export interface PlatformSiteLandingCopy {
  navBrand: string;
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  sectionTitle: string;
  sectionSub: string;
  demoTitle: string;
  demoSub: string;
  plansSectionTitle: string;
  plansSectionSub: string;
  ctaTitle: string;
  ctaLead: string;
  footerNote: string;
  /** Texto plano del aviso superior (demo / legal); si vacío se usa el texto por defecto del front. */
  demoBannerText: string;
}

export interface PlatformSiteConfig {
  currencyCode: string;
  currencySymbol: string;
  planPriceBasic: number;
  planPricePro: number;
  planPriceBusiness: number;
  landing: PlatformSiteLandingCopy;
}

export const DEFAULT_PLATFORM_SITE_CONFIG: PlatformSiteConfig = {
  currencyCode: 'COP',
  currencySymbol: '$',
  planPriceBasic: 79_000,
  planPricePro: 199_000,
  planPriceBusiness: 399_000,
  landing: {
    navBrand: 'Azenda',
    eyebrow: 'SaaS multi-tenant modular',
    heroTitle: 'Citas, ventas e inventario en un solo panel',
    heroLead:
      'Azenda combina agenda inteligente, POS ligero y stock para negocios que viven de las reservas. Activa solo los módulos que necesitas.',
    sectionTitle: 'Todo lo esencial, sin ruido',
    sectionSub: 'Diseñado para barberías, spas, clínicas ligeras y talleres con cita previa.',
    demoTitle: 'Reservas públicas + WhatsApp',
    demoSub:
      'Tus clientes eligen servicio, fecha y hora en una página limpia. Integración WhatsApp por niveles (enlace, plantilla, futuro chatbot).',
    plansSectionTitle: 'Planes claros',
    plansSectionSub: 'Los límites reales (empleados, citas/mes, módulos) los aplicará el backend.',
    ctaTitle: 'Listo para operar tu negocio real',
    ctaLead: 'Registro, tenant y módulos serán persistidos cuando conectemos el backend.',
    footerNote: '© 2026 Azenda · Demo front-end',
    demoBannerText: '',
  },
};
