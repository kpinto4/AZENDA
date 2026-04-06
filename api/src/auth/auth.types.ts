export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EMPLEADO = 'EMPLEADO',
  CLIENTE_FINAL = 'CLIENTE_FINAL',
}

export enum AppSystem {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT = 'TENANT',
  PUBLIC_BOOKING = 'PUBLIC_BOOKING',
}

export type UserStatus = 'ACTIVE' | 'PAUSED' | 'BLOCKED';

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  tenantId: string | null;
  systems: AppSystem[];
  status: UserStatus;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  systems: AppSystem[];
}
