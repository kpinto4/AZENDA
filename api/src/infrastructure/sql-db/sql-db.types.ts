import { AppSystem, UserRole, UserStatus } from '../../auth/auth.types';

export interface TenantEntity {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
  /** Trial | Básico | Pro | Negocio (planes comerciales). */
  plan: string;
  /** Catálogo público tipo tienda (planes Pro+ y módulos ventas+inventario). */
  storefrontEnabled: boolean;
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
