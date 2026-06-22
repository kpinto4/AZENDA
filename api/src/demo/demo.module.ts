import { Module } from '@nestjs/common';
import { PasswordModule } from '../auth/password.module';
import { SqlDbModule } from '../infrastructure/sql-db/sql-db.module';
import { DemoBootstrapService } from './demo-bootstrap.service';
import { DemoResetService } from './demo-reset.service';
import { DemoSeedService } from './demo-seed.service';

@Module({
  imports: [SqlDbModule, PasswordModule],
  providers: [DemoSeedService, DemoResetService, DemoBootstrapService],
  exports: [DemoSeedService, DemoResetService],
})
export class DemoModule {}
