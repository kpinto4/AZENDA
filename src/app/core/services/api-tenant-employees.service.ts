import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    return this.http.get<ApiTenantEmployeeDto[]>(`${environment.apiBaseUrl}/tenant/employees`);
  }

  create(body: {
    name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'EMPLEADO';
  }): Observable<ApiTenantEmployeeDto> {
    return this.http.post<ApiTenantEmployeeDto>(`${environment.apiBaseUrl}/tenant/employees`, body);
  }

  patch(
    userId: string,
    body: Partial<{ name: string; email: string; password: string; role: 'ADMIN' | 'EMPLEADO' }>,
  ): Observable<ApiTenantEmployeeDto> {
    return this.http.patch<ApiTenantEmployeeDto>(
      `${environment.apiBaseUrl}/tenant/employees/${encodeURIComponent(userId)}`,
      body,
    );
  }

  delete(userId: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(
      `${environment.apiBaseUrl}/tenant/employees/${encodeURIComponent(userId)}`,
    );
  }
}
