export declare class CreateTenantDto {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
    citas?: boolean;
    ventas?: boolean;
    inventario?: boolean;
    plan?: string;
    storefrontEnabled?: boolean;
}
