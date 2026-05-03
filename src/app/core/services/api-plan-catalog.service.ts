import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiPlanCatalogEntry {
  planKey: string;
  priceMonthly: number;
  priceYearly: number;
}

export interface ApiReplacePlanCatalogBody {
  entries: ApiPlanCatalogEntry[];
}

@Injectable({ providedIn: 'root' })
export class ApiPlanCatalogService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiPlanCatalogEntry[]> {
    return this.http.get<ApiPlanCatalogEntry[]>(
      `${environment.apiBaseUrl}/admin/plan-catalog`,
    );
  }

  replace(body: ApiReplacePlanCatalogBody): Observable<ApiPlanCatalogEntry[]> {
    return this.http.put<ApiPlanCatalogEntry[]>(
      `${environment.apiBaseUrl}/admin/plan-catalog`,
      body,
    );
  }
}
