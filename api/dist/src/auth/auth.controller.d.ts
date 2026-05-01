import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './auth.types';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        tokenType: string;
        user: {
            id: string;
            email: string;
            password?: string;
            role: import("./auth.types").UserRole;
            tenantId: string | null;
            systems: import("./auth.types").AppSystem[];
            status: import("./auth.types").UserStatus;
        };
    }>;
    me(req: AuthenticatedRequest): Promise<{
        id: string;
        email: string;
        password?: string;
        role: import("./auth.types").UserRole;
        tenantId: string | null;
        systems: import("./auth.types").AppSystem[];
        status: import("./auth.types").UserStatus;
    }>;
}
export {};
