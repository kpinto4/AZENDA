import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api-base-url';

export interface ApiStoreVisitDto {
  id: string;
  tenantId: string;
  customer: string;
  detail: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiStoreVisitsService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiStoreVisitDto[]> {
    return this.http.get<ApiStoreVisitDto[]>(
      `${apiBaseUrl()}/tenant/tienda-registros`,
    );
  }
}
