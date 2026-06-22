"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_VOLATILE_SALES = exports.DEMO_VOLATILE_APPOINTMENTS = exports.DEMO_CORE_PRODUCTS = exports.DEMO_CORE_SERVICES = exports.DEMO_SEED_PASSWORD = exports.DEMO_EMPLOYEE_EMAIL = exports.DEMO_ADMIN_EMAIL = exports.DEMO_EMPLOYEE_USER_ID = exports.DEMO_ADMIN_USER_ID = exports.DEMO_TENANT_NAME = exports.DEMO_TENANT_SLUG = exports.DEMO_TENANT_ID = void 0;
exports.appendEmployeeToServiceLabel = appendEmployeeToServiceLabel;
exports.formatAppointmentWhen = formatAppointmentWhen;
exports.formatSaleDate = formatSaleDate;
exports.DEMO_TENANT_ID = 'tenant_azenda_demo';
exports.DEMO_TENANT_SLUG = 'azenda-demo';
exports.DEMO_TENANT_NAME = 'Barbería Azenda Demo';
exports.DEMO_ADMIN_USER_ID = 'usr_demo_admin';
exports.DEMO_EMPLOYEE_USER_ID = 'usr_demo_employee';
exports.DEMO_ADMIN_EMAIL = 'demo-admin@azenda.dev';
exports.DEMO_EMPLOYEE_EMAIL = 'demo-empleado@azenda.dev';
exports.DEMO_SEED_PASSWORD = 'azenda123';
exports.DEMO_CORE_SERVICES = [
    {
        id: 'svc_demo_corte',
        name: 'Corte clásico',
        description: 'Corte tradicional con tijera y máquina.',
        price: 28000,
        durationMinutes: 30,
        catalogOrder: 0,
    },
    {
        id: 'svc_demo_fade',
        name: 'Fade degradado',
        description: 'Degradado limpio con detalle en contornos.',
        price: 35000,
        durationMinutes: 45,
        catalogOrder: 1,
    },
    {
        id: 'svc_demo_corte_barba',
        name: 'Corte + barba',
        description: 'Corte completo y perfilado de barba.',
        price: 45000,
        durationMinutes: 60,
        catalogOrder: 2,
    },
    {
        id: 'svc_demo_barba',
        name: 'Arreglo de barba',
        description: 'Perfilado, toalla caliente y aceite.',
        price: 22000,
        durationMinutes: 25,
        catalogOrder: 3,
    },
    {
        id: 'svc_demo_peinado',
        name: 'Peinado',
        description: 'Peinado con producto de acabado.',
        price: 18000,
        durationMinutes: 20,
        catalogOrder: 4,
    },
];
exports.DEMO_CORE_PRODUCTS = [
    {
        id: 'prd_demo_cera',
        name: 'Cera mate',
        description: 'Fijación media, acabado natural.',
        price: 32000,
        sku: 'CERA-01',
        stock: 18,
        catalogOrder: 0,
    },
    {
        id: 'prd_demo_shampoo',
        name: 'Shampoo barbería',
        description: 'Limpieza profunda 400 ml.',
        price: 28000,
        sku: 'SHP-01',
        stock: 24,
        catalogOrder: 1,
    },
    {
        id: 'prd_demo_gel',
        name: 'Gel fijador',
        description: 'Alta fijación, brillo suave.',
        price: 24000,
        sku: 'GEL-01',
        stock: 12,
        catalogOrder: 2,
    },
    {
        id: 'prd_demo_aceite',
        name: 'Aceite de barba',
        description: 'Hidratación y aroma suave.',
        price: 38000,
        sku: 'ACE-01',
        stock: 9,
        catalogOrder: 3,
    },
    {
        id: 'prd_demo_tinte',
        name: 'Tinte capilar',
        description: 'Cobertura de canas, tono castaño.',
        price: 42000,
        sku: 'TIN-01',
        stock: 6,
        catalogOrder: 4,
    },
];
exports.DEMO_VOLATILE_APPOINTMENTS = [
    {
        id: 'appt_demo_1',
        customer: 'Laura M.',
        serviceName: 'Corte clásico',
        offsetMinutes: 90,
        status: 'confirmada',
        employeeId: exports.DEMO_EMPLOYEE_USER_ID,
    },
    {
        id: 'appt_demo_2',
        customer: 'Andrés P.',
        serviceName: 'Fade degradado',
        offsetMinutes: 180,
        status: 'pendiente',
        employeeId: exports.DEMO_EMPLOYEE_USER_ID,
    },
    {
        id: 'appt_demo_3',
        customer: 'Camila R.',
        serviceName: 'Corte + barba',
        offsetMinutes: 300,
        status: 'confirmada',
        employeeId: exports.DEMO_EMPLOYEE_USER_ID,
    },
    {
        id: 'appt_demo_4',
        customer: 'Equipo corporativo',
        serviceName: 'Peinado',
        offsetMinutes: 120,
        status: 'confirmada',
        employeeId: exports.DEMO_ADMIN_USER_ID,
    },
    {
        id: 'appt_demo_5',
        customer: 'Diego S.',
        serviceName: 'Arreglo de barba',
        offsetMinutes: 240,
        status: 'pendiente',
        employeeId: null,
    },
];
exports.DEMO_VOLATILE_SALES = [
    { id: 'sale_demo_1', total: 45000, method: 'Efectivo', daysAgo: 0 },
    { id: 'sale_demo_2', total: 32000, method: 'Transferencia', daysAgo: 1 },
    { id: 'sale_demo_3', total: 28000, method: 'Efectivo', daysAgo: 2 },
    { id: 'sale_demo_4', total: 67000, method: 'Nequi', daysAgo: 3 },
];
function appendEmployeeToServiceLabel(serviceName, employeeId) {
    const base = serviceName.trim();
    if (!employeeId) {
        return `${base} · EmpleadoId:any`;
    }
    return `${base} · EmpleadoId:${employeeId}`;
}
function formatAppointmentWhen(offsetMinutes, now = new Date()) {
    const d = new Date(now.getTime() + offsetMinutes * 60_000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
}
function formatSaleDate(daysAgo, now = new Date()) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
//# sourceMappingURL=demo-tenant.snapshot.js.map