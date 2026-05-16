import { TenantBillingService } from './tenant-billing.service';
import { TenantRepository } from './repositories/tenant.repository';

describe('TenantBillingService', () => {
  const tenant = {
    id: 't1',
    name: 'Test',
    slug: 'test',
    status: 'ACTIVE' as const,
    plan: 'Básico',
    storefrontEnabled: false,
    manualBookingEnabled: true,
    billingCycle: 'MONTHLY' as const,
    planPriceMonthly: 30,
    planPriceYearly: 300,
    subscriptionStartedAt: '2026-01-01T00:00:00.000Z',
    currentPeriodStart: '2026-01-01T00:00:00.000Z',
    currentPeriodEnd: '2026-02-01T00:00:00.000Z',
    nextRenewalAt: '2026-02-01T00:00:00.000Z',
    modules: { citas: true, ventas: true, inventario: false },
  };

  it('getTenantBillingSnapshot devuelve undefined si no hay tenant', async () => {
    const tenants = { findById: jest.fn().mockResolvedValue(undefined) } as unknown as TenantRepository;
    const svc = new TenantBillingService(tenants);
    await expect(svc.getTenantBillingSnapshot('x')).resolves.toBeUndefined();
  });

  it('getTenantBillingSnapshot incluye progreso de periodo', async () => {
    const tenants = { findById: jest.fn().mockResolvedValue(tenant) } as unknown as TenantRepository;
    const svc = new TenantBillingService(tenants);
    const snap = await svc.getTenantBillingSnapshot('t1');
    expect(snap).toBeDefined();
    expect(snap!.cycle).toBe('MONTHLY');
    expect(snap!.daysTotal).toBeGreaterThan(0);
    expect(snap!.progressPct).toBeGreaterThanOrEqual(0);
    expect(snap!.progressPct).toBeLessThanOrEqual(100);
  });

  it('getUpgradeQuote devuelve undefined si el tenant no existe', async () => {
    const tenants = {
      findById: jest.fn().mockResolvedValue(undefined),
      getPlanCatalogPrices: jest.fn(),
    } as unknown as TenantRepository;
    const svc = new TenantBillingService(tenants);
    await expect(
      svc.getUpgradeQuote({ tenantId: 'x', targetPlan: 'Pro', targetCycle: 'MONTHLY' }),
    ).resolves.toBeUndefined();
  });
});
