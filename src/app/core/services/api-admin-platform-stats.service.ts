import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api-base-url';

export interface ApiPlatformOverviewDto {
  tenantCount: number;
  activeTenantCount: number;
  appointmentCount: number;
  salesCount: number;
  salesTotalCop: number;
  tenantPanelUserCount: number;
  stockMovementsCount: number;
  tenantsWithModuleCitas: number;
  tenantsWithModuleVentas: number;
  tenantsWithModuleInventario: number;
  estimatedMrrMonthlyCop: number;
}

@Injectable({ providedIn: 'root' })
export class ApiAdminPlatformStatsService {
  private readonly http = inject(HttpClient);

  overview(): Observable<ApiPlatformOverviewDto> {
    return this.http.get<ApiPlatformOverviewDto>(`${apiBaseUrl()}/admin/platform-stats`);
  }
}
