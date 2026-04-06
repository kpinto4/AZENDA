import { JwtService } from '@nestjs/jwt';
import { AuthUser, AppSystem, UserRole } from './auth.types';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly jwtService;
    private readonly users;
    constructor(jwtService: JwtService);
    login(dto: LoginDto): {
        accessToken: string;
        tokenType: string;
        user: {
            id: string;
            email: string;
            role: UserRole;
            tenantId: string | null;
            systems: AppSystem[];
            status: import("./auth.types").UserStatus;
        };
    };
    me(userId: string): {
        id: string;
        email: string;
        role: UserRole;
        tenantId: string | null;
        systems: AppSystem[];
        status: import("./auth.types").UserStatus;
    };
    findById(userId: string): AuthUser | undefined;
    private toSafeUser;
}
