import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AccessController } from './access/access.controller';
import { SqlDbModule } from './infrastructure/sql-db/sql-db.module';
import { TenantModule } from './tenant/tenant.module';
import { AdminModule } from './admin/admin.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [SqlDbModule, AuthModule, TenantModule, AdminModule, PublicModule],
  controllers: [AppController, AccessController],
  providers: [AppService],
})
export class AppModule {}
