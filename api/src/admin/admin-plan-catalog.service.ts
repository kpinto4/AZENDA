import { Injectable } from '@nestjs/common';
import { PlanCatalogEntry } from '../infrastructure/sql-db/sql-db.types';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';

@Injectable()
export class AdminPlanCatalogService {
  constructor(private readonly tenants: TenantRepository) {}

  list(): Promise<PlanCatalogEntry[]> {
    return this.tenants.listPlanCatalog();
  }

  replace(entries: PlanCatalogEntry[]): Promise<PlanCatalogEntry[]> {
    return this.tenants.replacePlanCatalog(entries);
  }
}
