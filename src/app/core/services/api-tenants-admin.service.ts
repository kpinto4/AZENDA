import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ApiTenantStatus = 'ACTIVE' | 'PAUSED' | 'BLOCKED';

/** Fila mínima de tenant (p. ej. `/tenant/context`, sincronización al mock). */
export interface ApiTenantDto {
  id: string;
  name: string;
  slug: string;
  status: ApiTenantStatus;
  plan: string;
  storefrontEnabled: boolean;
  manualBookingEnabled: boolean;
  modules: { citas: boolean; ventas: boolean; inventario: boolean };
}

/** Respuesta de administración: incluye campos de facturación persistidos en `tenants`. */
export interface ApiTenantAdminDto extends ApiTenantDto {
  billingCycle: 'MONTHLY' | 'YEARLY';
  planPriceMonthly: number;
  planPriceYearly: number;
  subscriptionStartedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewalAt: string;
}

export interface ApiCreateTenantBody {
  id: string;
  name: string;
  slug: string;
  status: ApiTenantStatus;
  plan?: string;
  storefrontEnabled?: boolean;
  manualBookingEnabled?: boolean;
  citas?: boolean;
  ventas?: boolean;
  inventario?: boolean;
  billingCycle?: 'MONTHLY' | 'YEARLY';
}

export interface ApiPatchTenantBody {
  name?: string;
  slug?: string;
  status?: ApiTenantStatus;
  plan?: string;
  storefrontEnabled?: boolean;
  manualBookingEnabled?: boolean;
  citas?: boolean;
  ventas?: boolean;
  inventario?: boolean;
  billingCycle?: 'MONTHLY' | 'YEARLY';
}

/** Respuesta de simulación de upgrade (prorrateo en el periodo actual). */
export interface ApiAdminUpgradeQuoteDto {
  tenantId: string;
  currentPlan: string;
  targetPlan: string;
  currentCycle: 'MONTHLY' | 'YEARLY';
  targetCycle: 'MONTHLY' | 'YEARLY';
  period: {
    start: string;
    end: string;
    totalDays: number;
    remainingDays: number;
  };
  creditAmount: number;
  targetCostForRemaining: number;
  amountDueNow: number;
  carryOverBalance: number;
}

@Injectable({ providedIn: 'root' })
export class ApiTenantsAdminService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiTenantAdminDto[]> {
    return this.http.get<ApiTenantAdminDto[]>(
      `${environment.apiBaseUrl}/admin/tenants`,
    );
  }

  getById(tenantId: string): Observable<ApiTenantAdminDto> {
    return this.http.get<ApiTenantAdminDto>(
      `${environment.apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantId)}`,
    );
  }

  upgradeQuote(
    tenantId: string,
    body: { targetPlan: string; targetCycle: 'MONTHLY' | 'YEARLY' },
  ): Observable<ApiAdminUpgradeQuoteDto> {
    return this.http.post<ApiAdminUpgradeQuoteDto>(
      `${environment.apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantId)}/upgrade-quote`,
      body,
    );
  }

  create(body: ApiCreateTenantBody): Observable<ApiTenantAdminDto> {
    return this.http.post<ApiTenantAdminDto>(
      `${environment.apiBaseUrl}/admin/tenants`,
      body,
    );
  }

  patch(
    tenantId: string,
    body: ApiPatchTenantBody,
  ): Observable<ApiTenantAdminDto> {
    return this.http.patch<ApiTenantAdminDto>(
      `${environment.apiBaseUrl}/admin/tenants/${tenantId}`,
      body,
    );
  }

  delete(tenantId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiBaseUrl}/admin/tenants/${tenantId}`,
    );
  }
}
