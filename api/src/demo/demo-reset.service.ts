import { Injectable, Logger } from '@nestjs/common';
import {
  DEMO_CORE_PRODUCTS,
  DEMO_CORE_SERVICES,
  DEMO_TENANT_ID,
} from '../../scripts/demo-tenant.snapshot';
import { PgClientService } from '../infrastructure/sql-db/pg-client.service';
import { DemoSeedService } from './demo-seed.service';

export interface DemoResetResult {
  tenantId: string;
  appointmentsDeleted: number;
  salesDeleted: number;
  visitsDeleted: number;
  stockMovementsDeleted: number;
  nonCoreServicesDeleted: number;
  nonCoreProductsDeleted: number;
  coreServicesPreserved: number;
  coreProductsPreserved: number;
  volatileReinserted: boolean;
}

@Injectable()
export class DemoResetService {
  private readonly logger = new Logger(DemoResetService.name);

  constructor(
    private readonly pg: PgClientService,
    private readonly demoSeed: DemoSeedService,
  ) {}

  async resetDemoTenantPartial(): Promise<DemoResetResult> {
    const tenantId = DEMO_TENANT_ID;
    const demoRow = await this.pg.queryOne(
      `SELECT id FROM tenants WHERE id = ? AND is_demo_tenant = true`,
      [tenantId],
    );
    if (!demoRow) {
      throw new Error('Tenant demo no encontrado o no marcado como demo');
    }

    const appointmentsDeleted = await this.countThenDelete(
      `SELECT COUNT(*) AS cnt FROM appointments WHERE tenant_id = ?`,
      `DELETE FROM appointments WHERE tenant_id = ?`,
      [tenantId],
    );
    const salesDeleted = await this.countThenDelete(
      `SELECT COUNT(*) AS cnt FROM tenant_sales WHERE tenant_id = ?`,
      `DELETE FROM tenant_sales WHERE tenant_id = ?`,
      [tenantId],
    );
    const visitsDeleted = await this.countThenDelete(
      `SELECT COUNT(*) AS cnt FROM store_visit_logs WHERE tenant_id = ?`,
      `DELETE FROM store_visit_logs WHERE tenant_id = ?`,
      [tenantId],
    );
    const stockMovementsDeleted = await this.countThenDelete(
      `SELECT COUNT(*) AS cnt FROM tenant_stock_movements WHERE tenant_id = ?`,
      `DELETE FROM tenant_stock_movements WHERE tenant_id = ?`,
      [tenantId],
    );
    const nonCoreServicesDeleted = await this.countThenDelete(
      `SELECT COUNT(*) AS cnt FROM tenant_services WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`,
      `DELETE FROM tenant_services WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`,
      [tenantId],
    );
    const nonCoreProductsDeleted = await this.countThenDelete(
      `SELECT COUNT(*) AS cnt FROM tenant_products WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`,
      `DELETE FROM tenant_products WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`,
      [tenantId],
    );

    await this.demoSeed.restoreCoreCatalogFromSnapshot();
    await this.demoSeed.insertVolatileSample();

    const coreServicesPreserved = await this.countCore('tenant_services');
    const coreProductsPreserved = await this.countCore('tenant_products');

    const result: DemoResetResult = {
      tenantId,
      appointmentsDeleted,
      salesDeleted,
      visitsDeleted,
      stockMovementsDeleted,
      nonCoreServicesDeleted,
      nonCoreProductsDeleted,
      coreServicesPreserved,
      coreProductsPreserved,
      volatileReinserted: true,
    };

    this.logger.log(
      `Reset demo parcial: citas=${appointmentsDeleted}, ventas=${salesDeleted}, ` +
        `core servicios=${coreServicesPreserved}/${DEMO_CORE_SERVICES.length}, ` +
        `core productos=${coreProductsPreserved}/${DEMO_CORE_PRODUCTS.length}`,
    );

    return result;
  }

  private async countThenDelete(
    countSql: string,
    deleteSql: string,
    params: unknown[],
  ): Promise<number> {
    const row = await this.pg.queryOne(countSql, params);
    const cnt = Number(row?.cnt ?? 0);
    await this.pg.exec(deleteSql, params);
    return cnt;
  }

  private async countCore(
    table: 'tenant_services' | 'tenant_products',
  ): Promise<number> {
    const row = await this.pg.queryOne(
      `SELECT COUNT(*) AS cnt FROM ${table} WHERE tenant_id = ? AND is_demo_core = true`,
      [DEMO_TENANT_ID],
    );
    return Number(row?.cnt ?? 0);
  }
}
