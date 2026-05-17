import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminSiteConfigService } from './admin-site-config.service';
import type {
  PlatformSiteConfig,
  PlatformSiteLandingCopy,
} from '../infrastructure/sql-db/sql-db.types';
import { PatchSiteConfigDto } from './dto/patch-site-config.dto';

@Controller('admin/site-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminSiteConfigController {
  constructor(private readonly adminSiteConfig: AdminSiteConfigService) {}

  @Get()
  get() {
    return this.adminSiteConfig.get();
  }

  @Patch()
  patch(@Body() dto: PatchSiteConfigDto) {
    const patch = dto as Partial<PlatformSiteConfig> & {
      landing?: Partial<PlatformSiteLandingCopy>;
    };
    return this.adminSiteConfig.patch(patch);
  }
}
