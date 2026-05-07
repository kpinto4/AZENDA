import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MockAppointment } from './mock-data.service';
import { MockSessionService } from './mock-session.service';
import type { ApiStoreVisitDto } from './api-store-visits.service';

export type ApiAppointmentAttendance = 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';

export interface ApiAppointmentDto {
  id: string;
  tenantId: string;
  customer: string;
  service: string;
  when: string;
  status: MockAppointment['status'];
  attendance: ApiAppointmentAttendance;
}

export function mapApiAppointmentToMock(
  row: ApiAppointmentDto,
  bookingSlug: string | null,
): MockAppointment {
  return {
    id: row.id,
    customer: row.customer,
    service: row.service,
    when: row.when,
    status: row.status,
    attendance: row.attendance ?? 'PENDIENTE',
    tenantSlug: bookingSlug ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiAppointmentsService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(MockSessionService);

  readonly rows = signal<ApiAppointmentDto[]>([]);

  readonly useRemote = computed(
    () => environment.useLiveAuth && !!this.session.accessToken() && this.session.isTenantUser(),
  );

  clear(): void {
    this.rows.set([]);
  }

  list(): Observable<ApiAppointmentDto[]> {
    return this.http
      .get<ApiAppointmentDto[]>(`${environment.apiBaseUrl}/tenant/appointments`)
      .pipe(tap((list) => this.rows.set(list)));
  }

  refresh(): Observable<ApiAppointmentDto[]> {
    if (!this.useRemote()) {
      this.clear();
      return of([]);
    }
    return this.list();
  }

  create(body: {
    customer: string;
    service: string;
    when: string;
  }): Observable<ApiAppointmentDto> {
    return this.http
      .post<ApiAppointmentDto>(`${environment.apiBaseUrl}/tenant/appointments`, body)
      .pipe(tap((created) => this.rows.update((cur) => [created, ...cur])));
  }

  patchStatus(
    id: string,
    status: ApiAppointmentDto['status'],
  ): Observable<ApiAppointmentDto> {
    return this.http
      .patch<ApiAppointmentDto>(
        `${environment.apiBaseUrl}/tenant/appointments/${encodeURIComponent(id)}/status`,
        { status },
      )
      .pipe(
        tap((updated) =>
          this.rows.update((cur) => cur.map((a) => (a.id === id ? updated : a))),
        ),
      );
  }

  createPublic(
    slug: string,
    body: { customer: string; service: string; when: string; employeeId?: string },
  ): Observable<ApiAppointmentDto> {
    return this.http.post<ApiAppointmentDto>(
      `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/appointments`,
      body,
    );
  }

  confirmPublicAttendance(
    slug: string,
    body: { appointmentId: string; customer: string },
  ): Observable<ApiAppointmentDto> {
    return this.http
      .post<ApiAppointmentDto>(
        `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/confirmar-asistencia`,
        body,
      )
      .pipe(
        tap((updated) =>
          this.rows.update((cur) => cur.map((a) => (a.id === updated.id ? updated : a))),
        ),
      );
  }

  createPublicStoreVisit(
    slug: string,
    body: { customer: string; detail: string },
  ): Observable<ApiStoreVisitDto> {
    return this.http.post<ApiStoreVisitDto>(
      `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/registro-tienda`,
      body,
    );
  }

  patchAttendance(id: string, attendance: ApiAppointmentAttendance): Observable<ApiAppointmentDto> {
    return this.http
      .patch<ApiAppointmentDto>(
        `${environment.apiBaseUrl}/tenant/appointments/${encodeURIComponent(id)}/attendance`,
        { attendance },
      )
      .pipe(
        tap((updated) =>
          this.rows.update((cur) => cur.map((a) => (a.id === id ? updated : a))),
        ),
      );
  }
}
