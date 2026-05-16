import { Global, Module } from '@nestjs/common';

import { PasswordModule } from '../../auth/password.module';

import { PgClientService } from './pg-client.service';

import { AppointmentRepository } from './repositories/appointment.repository';

import { PlatformSiteConfigRepository } from './repositories/platform-site-config.repository';

import { PlatformStatsRepository } from './repositories/platform-stats.repository';

import { TenantBrandingRepository } from './repositories/tenant-branding.repository';

import { TenantCatalogRepository } from './repositories/tenant-catalog.repository';

import { TenantRetailRepository } from './repositories/tenant-retail.repository';

import { TenantRepository } from './repositories/tenant.repository';

import { UserRepository } from './repositories/user.repository';

import { SqlDbService } from './sql-db.service';

import { TenantBillingService } from './tenant-billing.service';



@Global()

@Module({

  imports: [PasswordModule],

  providers: [

    PgClientService,

    UserRepository,

    TenantRepository,

    TenantBillingService,

    TenantBrandingRepository,

    PlatformSiteConfigRepository,

    PlatformStatsRepository,

    AppointmentRepository,

    TenantCatalogRepository,

    TenantRetailRepository,

    SqlDbService,

  ],

  exports: [

    SqlDbService,

    UserRepository,

    TenantRepository,

    TenantBillingService,

    TenantBrandingRepository,

    PlatformSiteConfigRepository,

    PlatformStatsRepository,

  ],

})

export class SqlDbModule {}

