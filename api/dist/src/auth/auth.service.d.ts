import { JwtService } from '@nestjs/jwt';
import { AppSystem, UserRole } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { PasswordService } from './password.service';
export declare class AuthService {
    private readonly jwtService;
    private readonly sqlDbService;
    private readonly passwordService;
    constructor(jwtService: JwtService, sqlDbService: SqlDbService, passwordService: PasswordService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        tokenType: string;
        user: {
            id: string;
            email: string;
            password?: string;
            role: UserRole;
            tenantId: string | null;
            systems: AppSystem[];
            status: import("./auth.types").UserStatus;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        tokenType: string;
        user: {
            id: string;
            email: string;
            password?: string;
            role: UserRole;
            tenantId: string | null;
            systems: AppSystem[];
            status: import("./auth.types").UserStatus;
        };
    }>;
    me(userId: string): Promise<{
        id: string;
        email: string;
        password?: string;
        role: UserRole;
        tenantId: string | null;
        systems: AppSystem[];
        status: import("./auth.types").UserStatus;
    }>;
    findById(userId: string): Promise<import("../infrastructure/sql-db/sql-db.types").UserEntity | undefined>;
    private toSafeUser;
    private slugifyName;
    private uniqueTenantSlug;
}
