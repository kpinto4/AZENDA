import { Global, Module } from '@nestjs/common';
import { PasswordModule } from '../../auth/password.module';
import { PgClientService } from './pg-client.service';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { SqlDbService } from './sql-db.service';

@Global()
@Module({
  imports: [PasswordModule],
  providers: [PgClientService, UserRepository, TenantRepository, SqlDbService],
  exports: [SqlDbService],
})
export class SqlDbModule {}
