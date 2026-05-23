import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
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
import { UiAlertService } from '../../core/services/ui-alert.service';
import { AgendaCalendarComponent } from '../../shared/agenda/agenda-calendar.component';
import type { AgendaCalendarEvent } from '../../shared/agenda/agenda-calendar.types';
import {
  DOW_LABELS,
  MESES_CORT,
  buildWaMeLink,
  buildWaReminderMessage,
  cleanServiceLabel,
  isCalendarVisibleAppointment,
  isPendingAttendanceClosure,
  parseWhenLocal,
  readEmployeeIdFromService,
} from '../../shared/agenda/agenda-calendar.utils';
import { AppointmentDetailSheetComponent } from '../../shared/agenda/appointment-detail-sheet.component';

const EMPLOYEE_COLORS = ['#2563eb', '#8b5cf6', '#db2777', '#0d9488', '#ea580c', '#4f46e5'];

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-tenant-appointments',
  imports: [ReactiveFormsModule, AgendaCalendarComponent, AppointmentDetailSheetComponent],
  templateUrl: './tenant-appointments.component.html',
  styleUrl: './tenant-appointments.component.scss',
})
export class TenantAppointmentsComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly alerts = inject(UiAlertService);
  readonly apiAppointments = inject(ApiAppointmentsService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  readonly createMsg = signal<string | null>(null);
  readonly createErr = signal<string | null>(null);
  readonly creatingAppointment = signal(false);
  readonly liveServiceOptions = signal<string[]>([]);
  readonly refreshingList = signal(false);

  readonly sheetOpen = signal(false);
  readonly sheetMode = signal<'detail' | 'day-list'>('detail');
  readonly sheetAppointment = signal<MockAppointment | null>(null);
  readonly sheetDayEvents = signal<AgendaCalendarEvent[]>([]);
  readonly sheetDayLabel = signal('');
  readonly createSheetOpen = signal(false);

  readonly attendanceQuickOptions: { value: MockAppointmentAttendance; label: string }[] = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ASISTIO', label: 'Asistió' },
    { value: 'NO_ASISTIO', label: 'No asistió' },
  ];

  readonly createForm = this.fb.nonNullable.group({
    customer: ['', [Validators.required, Validators.minLength(2)]],
    service: ['', [Validators.required, Validators.minLength(2)]],
    date: ['', Validators.required],
    time: ['09:00', Validators.required],
  });

  readonly showManualCreateCard = computed(() => false);
  readonly canCreateManualAppointment = computed(() => false);
  readonly appointmentsBlockedMessage = computed(() => this.session.tenantRestrictionMessage());
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
    const me = this.session.currentUserId();
    if (this.apiAppointments.useRemote()) {
      const slug = this.session.publicBookingSlug();
      const mapped = this.apiAppointments.rows().map((row) => mapApiAppointmentToMock(row, slug));
      if (this.session.role() === 'EMPLOYEE' && me) {
        return mapped.filter((a) => {
          const emp = readEmployeeIdFromService(a.service);
          return emp === me;
        });
      }
      return mapped;
    }
    return this.data.appointmentsForBookingSlug(this.session.publicBookingSlug());
  });

  readonly calendarAppointments = computed(() =>
    this.tenantAppointments().filter((a) => isCalendarVisibleAppointment(a)),
  );

  readonly pendingClosureAppointments = computed(() =>
    this
      .tenantAppointments()
      .filter((a) => isPendingAttendanceClosure(a))
      .sort((a, b) => b.when.localeCompare(a.when)),
  );

  readonly employeeColorMap = computed(() => {
    const map = new Map<string, string>();
    const names = new Set<string>();
    for (const a of this.calendarAppointments()) {
      names.add(this.employeeForAppointment(a));
    }
    [...names].forEach((name, idx) => map.set(name, EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]));
    return map;
  });

  readonly sheetEmployeeName = computed(() => {
    const a = this.sheetAppointment();
    return a ? this.employeeForAppointment(a) : '';
  });

  readonly sheetWaLink = computed(() => {
    const a = this.sheetAppointment();
    if (!a?.waReminderConsent || !a.customerPhoneE164) {
      return null;
    }
    const tid = this.session.tenantId();
    const branding = tid ? this.data.brandingForTenant(tid) : null;
    const biz = (branding?.displayName ?? '').trim() || 'Tu negocio';
    const phoneDigits = a.customerPhoneE164.replace(/\D/g, '');
    return buildWaMeLink(
      phoneDigits,
      buildWaReminderMessage({
        customerName: a.customer,
        service: a.service,
        when: a.when,
        businessName: biz,
        employeeName: this.employeeForAppointment(a),
      }),
    );
  });

  /** Citas hoy o mañana con móvil y sin marcar recordatorio manual enviado. */
  readonly manualReminderCandidates = computed(() => {
    const tid = this.session.tenantId();
    const branding = tid ? this.data.brandingForTenant(tid) : null;
    const biz = (branding?.displayName ?? '').trim() || 'Tu negocio';
    const todayY = toYmdLocal(new Date());
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tomY = toYmdLocal(tmr);
    return this
      .tenantAppointments()
      .filter((a) => {
        const p = parseWhenLocal(a.when);
        if (!p || a.status === 'cancelada') {
          return false;
        }
        const phone = (a.customerPhoneE164 ?? '').replace(/\D/g, '');
        if (!a.waReminderConsent || !phone || a.waReminderSentAt) {
          return false;
        }
        return p.ymd === todayY || p.ymd === tomY;
      })
      .map((a) => {
        const phoneDigits = (a.customerPhoneE164 ?? '').replace(/\D/g, '');
        return {
          appointment: a,
          link: this.buildClientWaReminderLink(a, biz, phoneDigits),
        };
      });
  });

  readonly employeeResolver = (a: MockAppointment) => this.employeeForAppointment(a);

  constructor() {
    effect(() => {
      if (this.creatingAppointment()) {
        this.createForm.disable({ emitEvent: false });
      } else {
        this.createForm.enable({ emitEvent: false });
      }
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

  private buildClientWaReminderLink(
    a: MockAppointment,
    businessDisplay: string,
    phoneDigits: string,
  ): string {
    return buildWaMeLink(
      phoneDigits,
      buildWaReminderMessage({
        customerName: a.customer,
        service: a.service,
        when: a.when,
        businessName: businessDisplay,
        employeeName: this.employeeForAppointment(a),
      }),
    );
  }

  markManualReminderDone(id: string): void {
    if (!this.apiAppointments.useRemote()) {
      this.alerts.info('Modo demo: no hay persistencia de recordatorio en servidor.');
      return;
    }
    this.apiAppointments.patchManualReminderSent(id).subscribe({
      next: () => {
        this.alerts.success('Recordatorio marcado como enviado.');
        const current = this.sheetAppointment();
        if (current?.id === id) {
          this.sheetAppointment.set({ ...current, waReminderSentAt: new Date().toISOString() });
        }
      },
      error: () => this.alerts.warning('No se pudo actualizar la cita.'),
    });
  }

  refreshAppointmentList(): void {
    if (!this.apiAppointments.useRemote()) {
      this.alerts.info('Modo demo: los datos están en esta sesión; recarga la página para simular cambios externos.');
      return;
    }
    this.refreshingList.set(true);
    this.apiAppointments.refresh().subscribe({
      next: () => {
        this.refreshingList.set(false);
        this.alerts.success('Lista actualizada.');
      },
      error: () => {
        this.refreshingList.set(false);
        this.alerts.warning('No se pudo actualizar la lista.');
      },
    });
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
    if (this.session.isTenantRestricted()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Operacion no permitida.');
      return;
    }
    const attendance = raw as MockAppointmentAttendance;
    if (this.apiAppointments.useRemote()) {
      this.apiAppointments.patchAttendance(id, attendance).subscribe({
        next: (updated) => {
          const current = this.sheetAppointment();
          if (current?.id === id) {
            this.sheetAppointment.set({
              ...current,
              attendance: updated.attendance,
              status: updated.status,
            });
          }
        },
        error: () => {},
      });
    } else {
      this.data.setAppointmentAttendance(id, attendance);
      const current = this.sheetAppointment();
      if (current?.id === id) {
        this.sheetAppointment.set({ ...current, attendance });
      }
    }
  }

  cancelAppointment(id: string): void {
    if (this.session.isTenantRestricted()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Operacion no permitida.');
      return;
    }
    const appt = this.tenantAppointments().find((a) => a.id === id);
    if (!appt) {
      return;
    }
    if (!isCalendarVisibleAppointment(appt)) {
      this.alerts.info('Solo puedes cancelar citas futuras que sigan activas.');
      return;
    }
    if (!this.apiAppointments.useRemote()) {
      this.data.setAppointmentStatus(id, 'cancelada');
      this.alerts.success('Cita cancelada (modo demo).');
      this.closeSheet();
      return;
    }
    this.apiAppointments.cancel(id).subscribe({
      next: () => {
        this.alerts.success('Cita cancelada. El horario quedó libre.');
        this.closeSheet();
      },
      error: () => this.alerts.warning('No se pudo cancelar la cita.'),
    });
  }

  openPendingClosure(appt: MockAppointment): void {
    this.sheetMode.set('detail');
    this.sheetAppointment.set(appt);
    this.sheetOpen.set(true);
  }

  canCancelAppointment(appt: MockAppointment | null): boolean {
    return !!appt && isCalendarVisibleAppointment(appt);
  }

  onAppointmentSelected(ev: AgendaCalendarEvent): void {
    this.sheetMode.set('detail');
    this.sheetAppointment.set(ev.appointment);
    this.sheetOpen.set(true);
  }

  onDayOverflow(payload: { dayKey: string; events: AgendaCalendarEvent[] }): void {
    this.sheetMode.set('day-list');
    this.sheetDayEvents.set(payload.events);
    this.sheetDayLabel.set(this.formatDayLabel(payload.dayKey));
    this.sheetAppointment.set(null);
    this.sheetOpen.set(true);
  }

  onSheetEventSelected(ev: AgendaCalendarEvent): void {
    this.sheetMode.set('detail');
    this.sheetAppointment.set(ev.appointment);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
  }

  openCreateSheet(): void {
    this.createSheetOpen.set(true);
  }

  closeCreateSheet(): void {
    this.createSheetOpen.set(false);
  }

  private formatDayLabel(ymd: string): string {
    const [y, mo, d] = ymd.split('-').map(Number);
    const date = new Date(y, (mo ?? 1) - 1, d ?? 1);
    return `${DOW_LABELS[date.getDay()]} ${d} ${MESES_CORT[(mo ?? 1) - 1]} ${y}`;
  }

  private employeeForAppointment(appt: MockAppointment): string {
    if (this.apiAppointments.useRemote()) {
      const employeeId = readEmployeeIdFromService(appt.service);
      if (!employeeId) {
        return 'Sin asignar';
      }
      if (employeeId === this.session.currentUserId()) {
        const own = this.session.userName().trim();
        return own || 'Mi cita';
      }
      return employeeId;
    }
    const employees = this.data.employees();
    if (!employees.length) {
      return 'Sin asignar';
    }
    const seed = `${appt.id}|${appt.customer}|${appt.service}`
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return employees[seed % employees.length].name;
  }

  createAppointment(): void {
    this.createMsg.set(null);
    this.createErr.set(null);
    if (this.session.isTenantRestricted()) {
      const msg = this.session.tenantRestrictionMessage() ?? 'Operacion no permitida.';
      this.createErr.set(msg);
      this.alerts.warning(msg);
      return;
    }
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
            this.alerts.info('La creacion manual esta desactivada por el administrador.');
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
                this.alerts.success('Reserva creada correctamente.');
                this.createForm.patchValue({ customer: '', service: '', time: '09:00' });
                this.createSheetOpen.set(false);
              },
              error: () => {
                this.creatingAppointment.set(false);
                this.createErr.set('No se pudo crear la cita. Revisa permisos o conexión.');
                this.alerts.error('No se pudo crear la reserva. Revisa permisos o conexion.');
              },
            });
        },
        error: () => {
          this.creatingAppointment.set(false);
          this.createErr.set('No se pudo validar permisos en tiempo real.');
          this.alerts.error('No se pudo validar permisos en tiempo real.');
        },
      });
      return;
    }
    if (!this.canCreateManualAppointment()) {
      this.createErr.set('No tienes permisos para crear citas manuales.');
      this.alerts.warning('No tienes permisos para crear citas manuales.');
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      this.createErr.set('No hay negocio activo para registrar la cita.');
      this.alerts.error('No hay negocio activo para registrar la cita.');
      return;
    }
    const created = this.data.recordBooking(v.customer.trim(), v.service.trim(), when, slug);
    if (!created) {
      this.createErr.set('Ya existe una cita en ese mismo día y hora.');
      this.alerts.warning('Ya existe una cita en ese mismo dia y hora.');
      return;
    }
    this.createMsg.set('Cita creada (modo demo).');
    this.alerts.success('Cita creada en modo demo.');
    this.createForm.patchValue({ customer: '', service: '', time: '09:00' });
    this.createSheetOpen.set(false);
  }

  displayServiceLabel(service: string): string {
    return cleanServiceLabel(service);
  }
}
