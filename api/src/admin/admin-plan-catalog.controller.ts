import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminPlanCatalogService } from './admin-plan-catalog.service';
import { ReplacePlanCatalogDto } from './dto/replace-plan-catalog.dto';

@Controller('admin/plan-catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminPlanCatalogController {
  constructor(private readonly planCatalog: AdminPlanCatalogService) {}

  @Get()
  list() {
    return this.planCatalog.list();
  }

  @Put()
  replace(@Body() body: ReplacePlanCatalogDto) {
    return this.planCatalog.replace(
      body.entries.map((e) => ({
        planKey: e.planKey,
        priceMonthly: e.priceMonthly,
        priceYearly: e.priceYearly,
      })),
    );
  }
}
