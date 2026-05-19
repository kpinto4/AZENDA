import { PasswordService } from '../../../auth/password.service';
import { PgClientService } from '../pg-client.service';
import { UserEntity } from '../sql-db.types';
export declare class UserRepository {
    private readonly pg;
    private readonly passwordService;
    private readonly logger;
    constructor(pg: PgClientService, passwordService: PasswordService);
    private mapUserRow;
    findByEmailNormalized(normalizedEmail: string): Promise<UserEntity | undefined>;
    findById(userId: string): Promise<UserEntity | undefined>;
    listAll(): Promise<UserEntity[]>;
    listByTenantId(tenantId: string): Promise<UserEntity[]>;
    create(data: UserEntity): Promise<UserEntity>;
    update(userId: string, patch: Partial<Omit<UserEntity, 'id'>>): Promise<UserEntity | undefined>;
    delete(userId: string): Promise<boolean>;
    deleteByTenant(userId: string, tenantId: string): Promise<boolean>;
    syncSeedPasswordIfInvalid(userId: string, plainPassword: string): Promise<void>;
    migrateLegacyPlaintextPasswords(): Promise<void>;
}
