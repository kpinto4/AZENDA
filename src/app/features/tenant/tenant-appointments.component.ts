import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ApiAppointmentsService,
  mapApiAppointmentToMock,
} from '../../core/services/api-appointments.service';
import {
  MockAppointment,
  MockAppointmentAttendance,
  MockDataService,
} from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

export interface CalSimDay {
  key: string;
  label: string;
  sub: string;
  events: { id: string; title: string; time: string; tone: 'primary' | 'accent' | 'neutral' }[];
}

const MESES_CORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lunes de la semana que contiene “hoy”, más `offsetWeeks` semanas. */
function mondayOfWeekWithOffset(offsetWeeks: number): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + offsetWeeks * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function parseWhenLocal(when: string): { ymd: string; time: string } | null {
  const s = when.trim();
  let m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?/.exec(s);
  if (m) {
    const hh = m[2].padStart(2, '0');
    return { ymd: m[1], time: `${hh}:${m[3]}` };
  }
  m = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (m) {
    return { ymd: m[1], time: '—' };
  }
  return null;
}

function weekRangeLabel(monday: Date): string {
  const fri = new Date(monday);
  fri.setDate(monday.getDate() + 4);
  const yMon = monday.getFullYear();
  if (monday.getMonth() === fri.getMonth()) {
    return `${monday.getDate()} – ${fri.getDate()} ${MESES_CORT[monday.getMonth()]} ${yMon}`;
  }
  return `${monday.getDate()} ${MESES_CORT[monday.getMonth()]} – ${fri.getDate()} ${MESES_CORT[fri.getMonth()]} ${fri.getFullYear()}`;
}

function statusTone(status: MockAppointment['status']): 'primary' | 'accent' | 'neutral' {
  if (status === 'confirmada') {
    return 'primary';
  }
  if (status === 'pendiente') {
    return 'accent';
  }
  return 'neutral';
}

function eventTone(a: MockAppointment): 'primary' | 'accent' | 'neutral' {
  const att = a.attendance ?? 'PENDIENTE';
  if (att === 'ASISTIO') {
    return 'primary';
  }
  if (att === 'NO_ASISTIO') {
    return 'neutral';
  }
  return statusTone(a.status);
}

@Component({
  selector: 'app-tenant-appointments',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-appointments.component.html',
  styleUrl: './tenant-appointments.component.scss',
})
export class TenantAppointmentsComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  readonly apiAppointments = inject(ApiAppointmentsService);

  readonly tenantAppointments = computed(() => {
    if (this.apiAppointments.useRemote()) {
      const slug = this.session.publicBookingSlug();
      return this.apiAppointments.rows().map((row) => mapApiAppointmentToMock(row, slug));
    }
    return this.data.appointmentsForBookingSlug(this.session.publicBookingSlug());
  });

  readonly serviceOptions = computed(() =>
    this.data.servicesForBookingSlug(this.session.publicBookingSlug()),
  );

  /** Desplazamiento en semanas respecto a la semana actual (lunes–viernes). */
  readonly calWeekOffset = signal(0);

  readonly calendarWeek = computed(() => {
    const monday = mondayOfWeekWithOffset(this.calWeekOffset());
    const dowLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const list = this.tenantAppointments();
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00'];

    const days: CalSimDay[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ymdStr = toYmdLocal(d);
      const events = list
        .map((a) => ({ a, p: parseWhenLocal(a.when) }))
        .filter(({ p }) => p && p.ymd === ymdStr)
        .sort((x, y) => x.a.when.localeCompare(y.a.when))
        .map(({ a, p }) => ({
          id: a.id,
          title: `${a.customer} · ${a.service}`,
          time: p!.time,
          tone: eventTone(a),
        }));
      days.push({
        key: `w${toYmdLocal(d)}`,
        label: dowLabels[i],
        sub: String(d.getDate()),
        events,
      });
    }

    return {
      weekLabel: weekRangeLabel(monday),
      days,
      hours,
    };
  });

  readonly form = this.fb.nonNullable.group({
    customer: ['', Validators.required],
    service: ['', Validators.required],
    when: ['', Validators.required],
  });

  shiftCalWeek(delta: number): void {
    this.calWeekOffset.update((o) => o + delta);
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    let when = raw.when.trim();
    if (when.includes('T')) {
      when = when.replace('T', ' ');
    }
    if (this.apiAppointments.useRemote()) {
      this.apiAppointments
        .create({
          customer: raw.customer,
          service: raw.service,
          when,
        })
        .subscribe({ error: () => {} });
    } else {
      this.data.addAppointment({
        customer: raw.customer,
        service: raw.service,
        when,
        status: 'pendiente',
        attendance: 'PENDIENTE',
        tenantSlug: this.session.publicBookingSlug() || undefined,
      });
    }
    this.form.reset({ customer: '', service: '', when: '' });
  }

  setStatus(id: string, raw: string): void {
    const status = raw as MockAppointment['status'];
    if (this.apiAppointments.useRemote()) {
      this.apiAppointments.patchStatus(id, status).subscribe({ error: () => {} });
    } else {
      this.data.setAppointmentStatus(id, status);
    }
  }

  setAttendance(id: string, raw: string): void {
    const attendance = raw as MockAppointmentAttendance;
    if (this.apiAppointments.useRemote()) {
      this.apiAppointments.patchAttendance(id, attendance).subscribe({ error: () => {} });
    } else {
      this.data.setAppointmentAttendance(id, attendance);
    }
  }
}
