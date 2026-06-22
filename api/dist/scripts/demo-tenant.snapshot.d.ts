export declare const DEMO_TENANT_ID = "tenant_azenda_demo";
export declare const DEMO_TENANT_SLUG = "azenda-demo";
export declare const DEMO_TENANT_NAME = "Barber\u00EDa Azenda Demo";
export declare const DEMO_ADMIN_USER_ID = "usr_demo_admin";
export declare const DEMO_EMPLOYEE_USER_ID = "usr_demo_employee";
export declare const DEMO_ADMIN_EMAIL = "demo-admin@azenda.dev";
export declare const DEMO_EMPLOYEE_EMAIL = "demo-empleado@azenda.dev";
export declare const DEMO_SEED_PASSWORD = "azenda123";
export interface DemoCoreServiceSeed {
    id: string;
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    catalogOrder: number;
}
export interface DemoCoreProductSeed {
    id: string;
    name: string;
    description: string;
    price: number;
    sku: string;
    stock: number;
    catalogOrder: number;
}
export interface DemoVolatileAppointmentSeed {
    id: string;
    customer: string;
    serviceName: string;
    offsetMinutes: number;
    status: 'pendiente' | 'confirmada';
    employeeId: string | null;
}
export interface DemoVolatileSaleSeed {
    id: string;
    total: number;
    method: string;
    daysAgo: number;
}
export declare const DEMO_CORE_SERVICES: DemoCoreServiceSeed[];
export declare const DEMO_CORE_PRODUCTS: DemoCoreProductSeed[];
export declare const DEMO_VOLATILE_APPOINTMENTS: DemoVolatileAppointmentSeed[];
export declare const DEMO_VOLATILE_SALES: DemoVolatileSaleSeed[];
export declare function appendEmployeeToServiceLabel(serviceName: string, employeeId: string | null): string;
export declare function formatAppointmentWhen(offsetMinutes: number, now?: Date): string;
export declare function formatSaleDate(daysAgo: number, now?: Date): string;
