import { AppSystem, UserRole, UserStatus } from '../../auth/auth.types';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'pending_payment' | 'active' | 'past_due' | 'canceled';
export interface PlanCatalogEntry {
    planKey: string;
    priceMonthly: number;
    priceYearly: number;
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
    plan: string;
    storefrontEnabled: boolean;
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
    isDemoTenant?: boolean;
    subscriptionStatus?: SubscriptionStatus;
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
export type AppointmentAttendance = 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';
export interface AppointmentEntity {
    id: string;
    tenantId: string;
    customer: string;
    service: string;
    when: string;
    status: AppointmentStatus;
    attendance: AppointmentAttendance;
    durationMinutes: number | null;
    customerPhoneE164: string | null;
    waReminderConsent: boolean;
    waReminderSentAt: string | null;
}
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
import type { CatalogPromoFields, PromoScheduleType } from '../../common/promo-schedule.util';
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
    durationMinutes: number;
    catalogOrder: number;
}
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
export interface TenantStockMovementEntity {
    id: string;
    tenantId: string;
    productId: string;
    productName: string;
    delta: number;
    reason: string;
    createdAt: string;
}
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
export declare const DEFAULT_PLATFORM_SITE_CONFIG: PlatformSiteConfig;
