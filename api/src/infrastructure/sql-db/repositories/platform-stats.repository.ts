import { Injectable } from '@nestjs/common';
import { PgClientService } from '../pg-client.service';

export interface PlatformOverviewStats {
  tenantCount: number;
  activeTenantCount: number;
  appointmentCount: number;
  salesCount: number;
  salesTotalCop: number;
  tenantPanelUserCount: number;
  /** Sin tabla de auditoría aún — siempre 0. */
  stockMovementsCount: number;
  tenantsWithModuleCitas: number;
  tenantsWithModuleVentas: number;
  tenantsWithModuleInventario: number;
  /** Suma de `plan_price_monthly` de tenants ACTIVE (lista de cobro mensual nominal). */
  estimatedMrrMonthlyCop: number;
}

@Injectable()
export class PlatformStatsRepository {
  constructor(private readonly pg: PgClientService) {}

  private n(row: Record<string, unknown> | undefined, key: string): number {
    if (!row) {
      return 0;
    }
    const v = row[key];
    if (v == null) {
      return 0;
    }
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  async loadOverview(): Promise<PlatformOverviewStats> {
    const [
      tenantsRow,
      activeTenantsRow,
      apptsRow,
      salesRow,
      tenantUsersRow,
      modAggRow,
      mrrRow,
    ] = await Promise.all([
      this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM tenants`, []),
      this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM tenants WHERE UPPER(status) = ?`, ['ACTIVE']),
      this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM appointments`, []),
      this.pg.queryOne(
        `
          SELECT COUNT(*)::bigint AS cnt,
                 COALESCE(SUM(total), 0)::numeric AS total_sum
          FROM tenant_sales
        `,
        [],
      ),
      this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM users WHERE tenant_id IS NOT NULL`, []),
      this.pg.queryOne(
        `
          SELECT
            COUNT(*) FILTER (WHERE citas_enabled)::bigint AS ccitas,
            COUNT(*) FILTER (WHERE ventas_enabled)::bigint AS cventas,
            COUNT(*) FILTER (WHERE inventario_enabled)::bigint AS cinv
          FROM tenants
        `,
        [],
      ),
      this.pg.queryOne(
        `
          SELECT COALESCE(SUM(plan_price_monthly), 0)::numeric AS s
          FROM tenants
          WHERE UPPER(status) = ?
        `,
        ['ACTIVE'],
      ),
    ]);

    return {
      tenantCount: Math.floor(this.n(tenantsRow, 'c')),
      activeTenantCount: Math.floor(this.n(activeTenantsRow, 'c')),
      appointmentCount: Math.floor(this.n(apptsRow, 'c')),
      salesCount: Math.floor(this.n(salesRow, 'cnt')),
      salesTotalCop: Math.round(this.n(salesRow, 'total_sum') * 100) / 100,
      tenantPanelUserCount: Math.floor(this.n(tenantUsersRow, 'c')),
      stockMovementsCount: 0,
      tenantsWithModuleCitas: Math.floor(this.n(modAggRow, 'ccitas')),
      tenantsWithModuleVentas: Math.floor(this.n(modAggRow, 'cventas')),
      tenantsWithModuleInventario: Math.floor(this.n(modAggRow, 'cinv')),
      estimatedMrrMonthlyCop: Math.round(this.n(mrrRow, 's') * 100) / 100,
    };
  }
}
