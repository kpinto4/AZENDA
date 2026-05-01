import { AppSystem, UserRole } from '../../auth/auth.types';
export declare class UpdateUserDto {
    email?: string;
    password?: string;
    role?: UserRole;
    tenantId?: string | null;
    systems?: AppSystem[];
    status?: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
}
