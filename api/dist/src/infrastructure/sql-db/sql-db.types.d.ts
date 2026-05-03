import { AppSystem, UserRole, UserStatus } from '../../auth/auth.types';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
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
