import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ApiTenantStatus = 'ACTIVE' | 'PAUSED' | 'BLOCKED';

export interface ApiTenantDto {
  id: string;
  name: string;
  slug: string;
  status: ApiTenantStatus;
  plan: string;
  storefrontEnabled: boolean;
  modules: { citas: boolean; ventas: boolean; inventario: boolean };
}

export interface ApiCreateTenantBody {
  id: string;
  name: string;
  slug: string;
  status: ApiTenantStatus;
  plan?: string;
  storefrontEnabled?: boolean;
  citas?: boolean;
  ventas?: boolean;
  inventario?: boolean;
}

export interface ApiPatchTenantBody {
  name?: string;
  slug?: string;
  status?: ApiTenantStatus;
  plan?: string;
  storefrontEnabled?: boolean;
  citas?: boolean;
  ventas?: boolean;
  inventario?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiTenantsAdminService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiTenantDto[]> {
    return this.http.get<ApiTenantDto[]>(
      `${environment.apiBaseUrl}/admin/tenants`,
    );
  }

  create(body: ApiCreateTenantBody): Observable<ApiTenantDto> {
    return this.http.post<ApiTenantDto>(
      `${environment.apiBaseUrl}/admin/tenants`,
      body,
    );
  }

  patch(tenantId: string, body: ApiPatchTenantBody): Observable<ApiTenantDto> {
    return this.http.patch<ApiTenantDto>(
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
