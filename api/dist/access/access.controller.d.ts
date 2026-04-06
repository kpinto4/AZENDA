import { Request } from 'express';
import { AuthUser, UserRole } from '../auth/auth.types';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class AccessController {
    adminPing(req: AuthenticatedRequest): {
        ok: boolean;
        area: string;
        userId: string;
        role: UserRole;
    };
    tenantPing(req: AuthenticatedRequest): {
        ok: boolean;
        area: string;
        userId: string;
        tenantId: string | null;
        role: UserRole;
    };
}
export {};
