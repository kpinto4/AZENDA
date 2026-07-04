import { Test } from '@nestjs/testing';
import {
  DEMO_CORE_PRODUCTS,
  DEMO_CORE_SERVICES,
  DEMO_TENANT_ID,
} from '../../scripts/demo-tenant.snapshot';
import { PgClientService } from '../infrastructure/sql-db/pg-client.service';
import { DemoResetService } from './demo-reset.service';
import { DemoSeedService } from './demo-seed.service';

describe('DemoResetService', () => {
  let service: DemoResetService;
  const pg = {
    queryOne: jest.fn(),
    exec: jest.fn(),
  };
  const demoSeed = {
    restoreCoreCatalogFromSnapshot: jest.fn(),
    insertVolatileSample: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    pg.queryOne.mockImplementation(async (sql: string) => {
      if (sql.includes('is_demo_tenant')) {
        return { id: DEMO_TENANT_ID };
      }
      if (
        sql.includes('is_demo_core = true') &&
        sql.includes('tenant_services')
      ) {
        return { cnt: DEMO_CORE_SERVICES.length };
      }
      if (
        sql.includes('is_demo_core = true') &&
        sql.includes('tenant_products')
      ) {
        return { cnt: DEMO_CORE_PRODUCTS.length };
      }
      return { cnt: 3 };
    });
    pg.exec.mockResolvedValue(undefined);
    demoSeed.restoreCoreCatalogFromSnapshot.mockResolvedValue(undefined);
    demoSeed.insertVolatileSample.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DemoResetService,
        { provide: PgClientService, useValue: pg },
        { provide: DemoSeedService, useValue: demoSeed },
      ],
    }).compile();

    service = moduleRef.get(DemoResetService);
  });

  it('resetea datos volátiles y preserva catálogo core', async () => {
    const result = await service.resetDemoTenantPartial();

    expect(result.tenantId).toBe(DEMO_TENANT_ID);
    expect(result.coreServicesPreserved).toBe(DEMO_CORE_SERVICES.length);
    expect(result.coreProductsPreserved).toBe(DEMO_CORE_PRODUCTS.length);
    expect(demoSeed.restoreCoreCatalogFromSnapshot).toHaveBeenCalled();
    expect(demoSeed.insertVolatileSample).toHaveBeenCalled();
    expect(pg.exec).toHaveBeenCalled();
  });
});
