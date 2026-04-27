import { Component, ElementRef, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ApiAppointmentsService,
  mapApiAppointmentToMock,
} from '../../core/services/api-appointments.service';
import { ApiTenantCatalogService } from '../../core/services/api-tenant-catalog.service';
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
  isToday: boolean;
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
  @ViewChild('calWeekScrollEl') private calWeekScrollEl?: ElementRef<HTMLDivElement>;
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  readonly apiAppointments = inject(ApiAppointmentsService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  readonly createMsg = signal<string | null>(null);
  readonly createErr = signal<string | null>(null);
  readonly creatingAppointment = signal(false);
  readonly liveServiceOptions = signal<string[]>([]);

  readonly createForm = this.fb.nonNullable.group({
    customer: ['', [Validators.required, Validators.minLength(2)]],
    service: ['', [Validators.required, Validators.minLength(2)]],
    date: ['', Validators.required],
    time: ['09:00', Validators.required],
  });

  readonly canCreateManualAppointment = computed(
    () =>
      this.session.role() === 'EMPLOYEE' && this.session.manualBookingEnabled(),
  );
  readonly showManualCreateCard = computed(() => this.canCreateManualAppointment());
  readonly manualServiceOptions = computed(() => {
    if (this.apiAppointments.useRemote()) {
      return this.liveServiceOptions();
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return [];
    }
    return this.data.listBusinessServicesForSlug(slug).map((s) => s.name);
  });

  readonly tenantAppointments = computed(() => {
    if (this.apiAppointments.useRemote()) {
      const slug = this.session.publicBookingSlug();
      return this.apiAppointments.rows().map((row) => mapApiAppointmentToMock(row, slug));
    }
    return this.data.appointmentsForBookingSlug(this.session.publicBookingSlug());
  });

  /** Desplazamiento en semanas respecto a la semana actual (lunes–viernes). */
  readonly calWeekOffset = signal(0);

  readonly calendarWeek = computed(() => {
    const monday = mondayOfWeekWithOffset(this.calWeekOffset());
    const dowLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const list = this.tenantAppointments();
    const todayYmd = toYmdLocal(new Date());

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
        isToday: ymdStr === todayYmd,
        events,
      });
    }

    return {
      weekLabel: weekRangeLabel(monday),
      days,
      totalEvents: days.reduce((acc, day) => acc + day.events.length, 0),
    };
  });

  readonly calGridTemplate = computed(() =>
    this.calendarWeek()
      .days.map((d) => (d.events.length ? 'minmax(162px, 1fr)' : 'minmax(100px, 0.62fr)'))
      .join(' '),
  );

  readonly calBoardMinWidth = computed(() =>
    Math.max(650, this.calendarWeek().days.reduce((acc, d) => acc + (d.events.length ? 162 : 100), 0)),
  );

  constructor() {
    effect(() => {
      this.calendarWeek();
      queueMicrotask(() => this.scrollCalendarToToday());
    });
    effect((onCleanup) => {
      if (!this.apiAppointments.useRemote()) {
        return;
      }
      const refresh = () => {
        untracked(() => this.session.refreshTenantModulesFromApi().subscribe({ error: () => {} }));
      };
      refresh();
      const timer = setInterval(refresh, 15000);
      onCleanup(() => clearInterval(timer));
    });
    effect(() => {
      if (!this.apiAppointments.useRemote()) {
        this.liveServiceOptions.set([]);
        return;
      }
      this.apiCatalog.getCatalog().subscribe({
        next: (res) => this.liveServiceOptions.set(res.services.map((s) => s.name)),
        error: () => this.liveServiceOptions.set([]),
      });
    });
  }

  shiftCalWeek(delta: number): void {
    this.calWeekOffset.update((o) => o + delta);
  }

  private scrollCalendarToToday(): void {
    const host = this.calWeekScrollEl?.nativeElement;
    if (!host) {
      return;
    }
    const todayEl = host.querySelector('.cal-day-column.today') as HTMLElement | null;
    if (todayEl) {
      todayEl.scrollIntoView({ block: 'nearest', inline: 'center' });
      return;
    }
    host.scrollLeft = 0;
  }

  statusLabel(status: MockAppointment['status']): string {
    if (status === 'confirmada') {
      return 'confirmada';
    }
    if (status === 'cancelada') {
      return 'cancelada';
    }
    return 'pendiente';
  }

  setAttendance(id: string, raw: string): void {
    const attendance = raw as MockAppointmentAttendance;
    if (this.apiAppointments.useRemote()) {
      this.apiAppointments.patchAttendance(id, attendance).subscribe({ error: () => {} });
    } else {
      this.data.setAppointmentAttendance(id, attendance);
    }
  }

  createAppointment(): void {
    this.createMsg.set(null);
    this.createErr.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    if (!v.service.trim()) {
      this.createErr.set('Debes seleccionar un servicio.');
      return;
    }
    const when = `${v.date} ${v.time}`;
    if (this.apiAppointments.useRemote()) {
      this.creatingAppointment.set(true);
      this.session.refreshTenantModulesFromApi().subscribe({
        next: () => {
          if (!this.canCreateManualAppointment()) {
            this.creatingAppointment.set(false);
            this.createErr.set('La creación manual fue desactivada por el admin.');
            return;
          }
          this.apiAppointments
            .create({
              customer: v.customer.trim(),
              service: v.service.trim(),
              when,
            })
            .subscribe({
              next: () => {
                this.creatingAppointment.set(false);
                this.createMsg.set('Cita creada correctamente.');
                this.createForm.patchValue({ customer: '', service: '', time: '09:00' });
              },
              error: () => {
                this.creatingAppointment.set(false);
                this.createErr.set('No se pudo crear la cita. Revisa permisos o conexión.');
              },
            });
        },
        error: () => {
          this.creatingAppointment.set(false);
          this.createErr.set('No se pudo validar permisos en tiempo real.');
        },
      });
      return;
    }
    if (!this.canCreateManualAppointment()) {
      this.createErr.set('No tienes permisos para crear citas manuales.');
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      this.createErr.set('No hay negocio activo para registrar la cita.');
      return;
    }
    const created = this.data.recordBooking(v.customer.trim(), v.service.trim(), when, slug);
    if (!created) {
      this.createErr.set('Ya existe una cita en ese mismo día y hora.');
      return;
    }
    this.createMsg.set('Cita creada (modo demo).');
    this.createForm.patchValue({ customer: '', service: '', time: '09:00' });
  }
}
