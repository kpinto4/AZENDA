/**
 * Definición del tenant showroom Azenda Demo.
 * Usado por seed en arranque y por reset parcial semanal.
 */

export const DEMO_TENANT_ID = 'tenant_azenda_demo';
export const DEMO_TENANT_SLUG = 'azenda-demo';
export const DEMO_TENANT_NAME = 'Barbería Azenda Demo';

export const DEMO_ADMIN_USER_ID = 'usr_demo_admin';
export const DEMO_EMPLOYEE_USER_ID = 'usr_demo_employee';
export const DEMO_ADMIN_EMAIL = 'demo-admin@azenda.dev';
export const DEMO_EMPLOYEE_EMAIL = 'demo-empleado@azenda.dev';
export const DEMO_SEED_PASSWORD = 'azenda123';

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
  /** minutos desde ahora (positivo = futuro) */
  offsetMinutes: number;
  status: 'pendiente' | 'confirmada';
  employeeId: string | null;
}

export interface DemoVolatileSaleSeed {
  id: string;
  total: number;
  method: string;
  /** días desde hoy (0 = hoy) */
  daysAgo: number;
}

export const DEMO_CORE_SERVICES: DemoCoreServiceSeed[] = [
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

export const DEMO_CORE_PRODUCTS: DemoCoreProductSeed[] = [
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

export const DEMO_VOLATILE_APPOINTMENTS: DemoVolatileAppointmentSeed[] = [
  {
    id: 'appt_demo_1',
    customer: 'Laura M.',
    serviceName: 'Corte clásico',
    offsetMinutes: 90,
    status: 'confirmada',
    employeeId: DEMO_EMPLOYEE_USER_ID,
  },
  {
    id: 'appt_demo_2',
    customer: 'Andrés P.',
    serviceName: 'Fade degradado',
    offsetMinutes: 180,
    status: 'pendiente',
    employeeId: DEMO_EMPLOYEE_USER_ID,
  },
  {
    id: 'appt_demo_3',
    customer: 'Camila R.',
    serviceName: 'Corte + barba',
    offsetMinutes: 300,
    status: 'confirmada',
    employeeId: DEMO_EMPLOYEE_USER_ID,
  },
  {
    id: 'appt_demo_4',
    customer: 'Equipo corporativo',
    serviceName: 'Peinado',
    offsetMinutes: 120,
    status: 'confirmada',
    employeeId: DEMO_ADMIN_USER_ID,
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

export const DEMO_VOLATILE_SALES: DemoVolatileSaleSeed[] = [
  { id: 'sale_demo_1', total: 45000, method: 'Efectivo', daysAgo: 0 },
  { id: 'sale_demo_2', total: 32000, method: 'Transferencia', daysAgo: 1 },
  { id: 'sale_demo_3', total: 28000, method: 'Efectivo', daysAgo: 2 },
  { id: 'sale_demo_4', total: 67000, method: 'Nequi', daysAgo: 3 },
];

export function appendEmployeeToServiceLabel(
  serviceName: string,
  employeeId: string | null,
): string {
  const base = serviceName.trim();
  if (!employeeId) {
    return `${base} · EmpleadoId:any`;
  }
  return `${base} · EmpleadoId:${employeeId}`;
}

export function formatAppointmentWhen(offsetMinutes: number, now = new Date()): string {
  const d = new Date(now.getTime() + offsetMinutes * 60_000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function formatSaleDate(daysAgo: number, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
