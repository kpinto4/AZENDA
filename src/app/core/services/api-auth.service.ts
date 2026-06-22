import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ApiUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'EMPLEADO'
  | 'CLIENTE_FINAL';

export interface ApiAuthUser {
  id: string;
  email: string;
  role: ApiUserRole;
  tenantId: string | null;
  systems: string[];
  status: string;
}

export interface ApiLoginResponse {
  accessToken: string;
  tokenType: string;
  user: ApiAuthUser;
  isDemoShowcase?: boolean;
}

export interface ApiTenantContextResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    storefrontEnabled: boolean;
    manualBookingEnabled: boolean;
    isDemoTenant?: boolean;
    subscriptionStatus?: string;
    modules: { citas: boolean; ventas: boolean; inventario: boolean };
  } | null;
  message?: string;
}

export interface ApiTenantBillingStatusResponse {
  tenantId: string;
  plan: string;
  status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
  subscriptionStartedAt: string;
  billing: {
    cycle: 'MONTHLY' | 'YEARLY';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    nextRenewalAt: string;
    monthlyPrice: number;
    yearlyPrice: number;
    daysTotal: number;
    daysElapsed: number;
    daysRemaining: number;
    progressPct: number;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Observable<ApiLoginResponse> {
    return this.http.post<ApiLoginResponse>(
      `${environment.apiBaseUrl}/auth/login`,
      { email, password },
    );
  }

  register(
    business: string,
    email: string,
    password: string,
    opts?: {
      selectedPlan?: string;
      billingCycle?: 'MONTHLY' | 'YEARLY';
    },
  ): Observable<ApiLoginResponse> {
    return this.http.post<ApiLoginResponse>(
      `${environment.apiBaseUrl}/auth/register`,
      {
        business,
        email,
        password,
        selectedPlan: opts?.selectedPlan,
        billingCycle: opts?.billingCycle,
      },
    );
  }

  demoSession(role: 'admin' | 'employee' = 'admin'): Observable<ApiLoginResponse> {
    return this.http.post<ApiLoginResponse>(
      `${environment.apiBaseUrl}/auth/demo-session`,
      { role },
    );
  }

  tenantContext(): Observable<ApiTenantContextResponse> {
    const url = `${environment.apiBaseUrl}/tenant/context`;
    return this.http.get<ApiTenantContextResponse>(url, {
      params: { _: String(Date.now()) },
    });
  }

  me(): Observable<ApiAuthUser> {
    return this.http.get<ApiAuthUser>(`${environment.apiBaseUrl}/auth/me`, {
      params: { _: String(Date.now()) },
    });
  }

  patchTenantSettings(body: {
    manualBookingEnabled?: boolean;
  }): Observable<ApiTenantContextResponse> {
    return this.http.patch<ApiTenantContextResponse>(
      `${environment.apiBaseUrl}/tenant/settings`,
      body,
    );
  }

  tenantBillingStatus(): Observable<ApiTenantBillingStatusResponse> {
    return this.http.get<ApiTenantBillingStatusResponse>(
      `${environment.apiBaseUrl}/tenant/billing/status`,
      { params: { _: String(Date.now()) } },
    );
  }
}
