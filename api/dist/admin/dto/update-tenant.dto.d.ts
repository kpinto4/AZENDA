export declare class UpdateTenantDto {
    name?: string;
    slug?: string;
    status?: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
    citas?: boolean;
    ventas?: boolean;
    inventario?: boolean;
    plan?: string;
    storefrontEnabled?: boolean;
    manualBookingEnabled?: boolean;
}
