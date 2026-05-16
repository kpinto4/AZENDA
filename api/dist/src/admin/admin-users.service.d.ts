import { UserRepository } from '../infrastructure/sql-db/repositories/user.repository';
import { UserEntity } from '../infrastructure/sql-db/sql-db.types';
export declare class AdminUsersService {
    private readonly users;
    constructor(users: UserRepository);
    listUsers(): Promise<UserEntity[]>;
    findById(userId: string): Promise<UserEntity | undefined>;
    create(data: UserEntity): Promise<UserEntity>;
    update(userId: string, patch: Partial<Omit<UserEntity, 'id'>>): Promise<UserEntity | undefined>;
    delete(userId: string): Promise<boolean>;
}
