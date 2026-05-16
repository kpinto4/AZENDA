import { AppSystem, UserRole } from '../auth/auth.types';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class AdminUsersController {
    private readonly adminUsers;
    constructor(adminUsers: AdminUsersService);
    listUsers(): Promise<{
        id: string;
        email: string;
        role: UserRole;
        tenantId: string | null;
        systems: AppSystem[];
        status: import("../auth/auth.types").UserStatus;
    }[]>;
    getUserById(userId: string): Promise<{
        id: string;
        email: string;
        role: UserRole;
        tenantId: string | null;
        systems: AppSystem[];
        status: import("../auth/auth.types").UserStatus;
    }>;
    createUser(body: CreateUserDto): Promise<{
        id: string;
        email: string;
        role: UserRole;
        tenantId: string | null;
        systems: AppSystem[];
        status: import("../auth/auth.types").UserStatus;
    }>;
    updateUser(userId: string, body: UpdateUserDto): Promise<{
        id: string;
        email: string;
        role: UserRole;
        tenantId: string | null;
        systems: AppSystem[];
        status: import("../auth/auth.types").UserStatus;
    }>;
    deleteUser(userId: string): Promise<void>;
}
