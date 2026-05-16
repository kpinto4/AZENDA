import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ApiAdminUserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLEADO' | 'CLIENTE_FINAL';

export type ApiAdminAppSystem = 'SUPER_ADMIN' | 'TENANT' | 'PUBLIC_BOOKING';

export interface ApiAdminUserDto {
  id: string;
  email: string;
  role: ApiAdminUserRole;
  tenantId: string | null;
  systems: ApiAdminAppSystem[];
  status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
}

export interface ApiCreateAdminUserBody {
  id: string;
  email: string;
  password: string;
  role: ApiAdminUserRole;
  tenantId?: string | null;
  systems: ApiAdminAppSystem[];
  status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
}

@Injectable({ providedIn: 'root' })
export class ApiAdminUsersService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiAdminUserDto[]> {
    return this.http.get<ApiAdminUserDto[]>(`${environment.apiBaseUrl}/admin/users`);
  }

  create(body: ApiCreateAdminUserBody): Observable<ApiAdminUserDto> {
    return this.http.post<ApiAdminUserDto>(`${environment.apiBaseUrl}/admin/users`, body);
  }

  delete(userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/admin/users/${encodeURIComponent(userId)}`);
  }
}
