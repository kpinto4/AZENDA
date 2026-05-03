import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import type { PlatformSiteConfig, PlatformSiteLandingCopy } from '../infrastructure/sql-db/sql-db.types';
import { PatchSiteConfigDto } from './dto/patch-site-config.dto';

@Controller('admin/site-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminSiteConfigController {
  constructor(private readonly sqlDb: SqlDbService) {}

  @Get()
  get() {
    return this.sqlDb.getPlatformSiteConfig();
  }

  @Patch()
  patch(@Body() dto: PatchSiteConfigDto) {
    const patch = dto as Partial<PlatformSiteConfig> & { landing?: Partial<PlatformSiteLandingCopy> };
    return this.sqlDb.patchPlatformSiteConfig(patch);
  }
}
