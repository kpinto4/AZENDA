import { Global, Module } from '@nestjs/common';
import { PasswordModule } from '../../auth/password.module';
import { SqlDbService } from './sql-db.service';

@Global()
@Module({
  imports: [PasswordModule],
  providers: [SqlDbService],
  exports: [SqlDbService],
})
export class SqlDbModule {}
