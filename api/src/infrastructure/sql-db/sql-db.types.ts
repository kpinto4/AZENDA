import { AppSystem, UserRole, UserStatus } from '../../auth/auth.types';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

export type SubscriptionStatus =
  | 'pending_payment'
  | 'active'
  | 'past_due'
  | 'canceled';

/** Precios de lista globales por plan comercial (Trial, Básico, Pro, Negocio). */
export interface PlanCatalogEntry {
  planKey: string;
  priceMonthly: number;
  priceYearly: number;
  /** Costo operativo aproximado (referencia interna super admin). */
  operatingCostApprox: number;
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
  /** Tenant showroom público (exploración sin contrato). */
  isDemoTenant?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  /** Si true, los precios no se sobrescriben con el catálogo global. */
  billingCustomized?: boolean;
  /** Notas de personalización (ej. empleados extra, módulos a medida). */
  billingNotes?: string;
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
  /** Duración reservada en minutos (catálogo al crear). */
  durationMinutes: number | null;
  customerPhoneE164: string | null;
  waReminderConsent: boolean;
  /** ISO 8601 cuando el negocio marcó recordatorio por WhatsApp (manual) o histórico de envío automático. */
  waReminderSentAt: string | null;
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
  /** Dirección o cómo llegar; se muestra en la reserva pública. */
  publicAddress: string | null;
  /** Enlace opcional (p. ej. Google Maps). */
  publicMapsUrl: string | null;
  /** Política de cancelación/reprogramación (texto libre). */
  cancellationPolicy: string | null;
  /** Aviso sobre recordatorios o contacto tras reservar. */
  reminderNotice: string | null;
  /** Dígitos E.164 sin + para wa.me del negocio (contacto / reservas). */
  whatsappPhoneE164: string | null;
  /** Texto por defecto para wa.me (primer mensaje al negocio). */
  whatsappDefaultMessage: string | null;
  /** JSON horario reserva pública: días mon–sun y franjas [{open,close},…]. */
  publicBookingHoursJson: string | null;
  /** Enlace externo para dejar reseña (p. ej. Google Maps). */
  reviewsUrl: string | null;
  /** JSON métodos de pago del POS: [{id,label,enabled,detail},…]. */
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

import type {
  CatalogPromoFields,
  PromoScheduleType,
} from '../../common/promo-schedule.util';

export type TenantCatalogPromoFields = CatalogPromoFields;

export interface TenantProductEntity {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  promoPrice: number | null;
  promoEnabled: boolean;
  promoScheduleType: PromoScheduleType | null;
  promoDays: number[];
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoLabel: string | null;
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
  promoEnabled: boolean;
  promoScheduleType: PromoScheduleType | null;
  promoDays: number[];
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoLabel: string | null;
  /** Duración estimada en minutos (reservas y agenda). */
  durationMinutes: number;
  catalogOrder: number;
}

/** Venta registrada desde el panel del tenant (POS ligero). */
export interface TenantSaleEntity {
  id: string;
  tenantId: string;
  saleDate: string;
  total: number;
  method: string;
  linkedAppointmentId: string | null;
  stockNote: string | null;
  createdAt: string;
}

/** Movimiento de inventario (ajuste manual o venta). */
export interface TenantStockMovementEntity {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  createdAt: string;
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
  /** Texto plano del aviso superior opcional (legal, campañas); reservado para usos futuros en la landing. */
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
    eyebrow: 'Gestión para negocios con citas',
    heroTitle: 'Agenda, ventas anotadas e inventario en un solo lugar',
    heroLead:
      'Reservas por web, panel de operación y todo en pesos colombianos. No cobramos con tarjeta en la app: tú cobras como siempre (efectivo, transferencia, etc.).',
    sectionTitle: 'Lo esencial para el día a día',
    sectionSub:
      'Peluquerías, spas, talleres y negocios con cita: reservas claras para el cliente y control para ti.',
    demoTitle: 'Tu página de reservas',
    demoSub:
      'El cliente elige servicio, día y hora en tu enlace. Tú confirmas y cobras por el canal que ya uses.',
    plansSectionTitle: 'Planes simples',
    plansSectionSub: 'Sube de plan cuando necesites más módulos o más equipo.',
    ctaTitle: 'Empieza con Azenda',
    ctaLead: 'Cuenta, servicios y enlace de reservas en pocos pasos.',
    footerNote: '© 2026 Azenda. Todos los derechos reservados.',
    demoBannerText: '',
  },
};
