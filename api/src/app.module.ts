import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AccessController } from './access/access.controller';
import { SqlDbModule } from './infrastructure/sql-db/sql-db.module';
import { TenantModule } from './tenant/tenant.module';
import { AdminModule } from './admin/admin.module';
import { PublicModule } from './public/public.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 400 }],
    }),
    SqlDbModule,
    DemoModule,
    AuthModule,
    TenantModule,
    AdminModule,
    PublicModule,
  ],
  controllers: [AppController, AccessController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
