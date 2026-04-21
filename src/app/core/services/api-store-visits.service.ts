import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
      `${environment.apiBaseUrl}/tenant/tienda-registros`,
    );
  }
}
