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
    modules: { citas: boolean; ventas: boolean; inventario: boolean };
  } | null;
  message?: string;
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
}
