import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DemoResetService } from '../demo/demo-reset.service';

@Controller('admin/demo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminDemoController {
  constructor(private readonly demoReset: DemoResetService) {}

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  resetNow() {
    return this.demoReset.resetDemoTenantPartial();
  }
}
