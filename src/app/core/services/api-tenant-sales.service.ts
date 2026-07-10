import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api-base-url';

export interface ApiTenantSaleDto {
  id: string;
  tenantId: string;
  saleDate: string;
  total: number;
  method: string;
  linkedAppointmentId: string | null;
  stockNote: string | null;
  createdAt: string;
}

export interface CreateTenantSaleBody {
  total: number;
  method: string;
  saleDate?: string;
  linkedAppointmentId?: string;
  productId?: string;
  quantity?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiTenantSalesService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiTenantSaleDto[]> {
    return this.http.get<ApiTenantSaleDto[]>(`${apiBaseUrl()}/tenant/ventas`);
  }

  create(body: CreateTenantSaleBody): Observable<ApiTenantSaleDto> {
    return this.http.post<ApiTenantSaleDto>(`${apiBaseUrl()}/tenant/ventas`, body);
  }
}
