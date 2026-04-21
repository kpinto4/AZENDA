import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
export declare class AuthService {
    private readonly jwtService;
    private readonly sqlDbService;
    constructor(jwtService: JwtService, sqlDbService: SqlDbService);
    login(dto: LoginDto): {
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
    };
    me(userId: string): {
        id: string;
        email: string;
        password?: string;
        role: import("./auth.types").UserRole;
        tenantId: string | null;
        systems: import("./auth.types").AppSystem[];
        status: import("./auth.types").UserStatus;
    };
    findById(userId: string): import("../infrastructure/sql-db/sql-db.types").UserEntity | undefined;
    private toSafeUser;
}
