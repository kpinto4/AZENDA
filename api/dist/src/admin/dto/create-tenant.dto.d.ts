export declare class CreateTenantDto {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
    adminEmail: string;
    adminPassword: string;
    citas?: boolean;
    ventas?: boolean;
    inventario?: boolean;
    plan?: string;
    storefrontEnabled?: boolean;
    manualBookingEnabled?: boolean;
    billingCycle?: 'MONTHLY' | 'YEARLY';
}
