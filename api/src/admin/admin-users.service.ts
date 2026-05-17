import { Injectable } from '@nestjs/common';
import { UserRepository } from '../infrastructure/sql-db/repositories/user.repository';
import { UserEntity } from '../infrastructure/sql-db/sql-db.types';

@Injectable()
export class AdminUsersService {
  constructor(private readonly users: UserRepository) {}

  listUsers(): Promise<UserEntity[]> {
    return this.users.listAll();
  }

  findById(userId: string): Promise<UserEntity | undefined> {
    return this.users.findById(userId);
  }

  create(data: UserEntity): Promise<UserEntity> {
    return this.users.create(data);
  }

  update(
    userId: string,
    patch: Partial<Omit<UserEntity, 'id'>>,
  ): Promise<UserEntity | undefined> {
    return this.users.update(userId, patch);
  }

  delete(userId: string): Promise<boolean> {
    return this.users.delete(userId);
  }
}
