import { Injectable } from '@nestjs/common';
import { planCatalogPricePatch } from '../infrastructure/sql-db/plan-catalog-site-config';
import { PlatformSiteConfigRepository } from '../infrastructure/sql-db/repositories/platform-site-config.repository';
import { PlanCatalogEntry } from '../infrastructure/sql-db/sql-db.types';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';

@Injectable()
export class AdminPlanCatalogService {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly platformSite: PlatformSiteConfigRepository,
  ) {}

  list(): Promise<PlanCatalogEntry[]> {
    return this.tenants.listPlanCatalog();
  }

  async replace(entries: PlanCatalogEntry[]): Promise<PlanCatalogEntry[]> {
    const updated = await this.tenants.replacePlanCatalog(entries);
    const pricePatch = planCatalogPricePatch(updated);
    if (Object.keys(pricePatch).length > 0) {
      await this.platformSite.patch(pricePatch);
    }
    return updated;
  }
}
