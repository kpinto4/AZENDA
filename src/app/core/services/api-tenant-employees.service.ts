import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api-base-url';

export interface ApiTenantEmployeeDto {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'EMPLEADO';
  status: string;
}

@Injectable({ providedIn: 'root' })
export class ApiTenantEmployeesService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiTenantEmployeeDto[]> {
    return this.http.get<ApiTenantEmployeeDto[]>(`${apiBaseUrl()}/tenant/employees`);
  }

  create(body: {
    name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'EMPLEADO';
  }): Observable<ApiTenantEmployeeDto> {
    return this.http.post<ApiTenantEmployeeDto>(`${apiBaseUrl()}/tenant/employees`, body);
  }

  patch(
    userId: string,
    body: Partial<{ name: string; email: string; password: string; role: 'ADMIN' | 'EMPLEADO' }>,
  ): Observable<ApiTenantEmployeeDto> {
    return this.http.patch<ApiTenantEmployeeDto>(
      `${apiBaseUrl()}/tenant/employees/${encodeURIComponent(userId)}`,
      body,
    );
  }

  delete(userId: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(
      `${apiBaseUrl()}/tenant/employees/${encodeURIComponent(userId)}`,
    );
  }
}
