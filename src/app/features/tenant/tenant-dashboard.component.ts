import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiAppointmentsService, mapApiAppointmentToMock } from '../../core/services/api-appointments.service';
import { ApiTenantCatalogService, ApiTenantProductDto } from '../../core/services/api-tenant-catalog.service';
import type { ApiTenantEmployeeDto } from '../../core/services/api-tenant-employees.service';
import { ApiTenantEmployeesService } from '../../core/services/api-tenant-employees.service';
import { ApiTenantSaleDto, ApiTenantSalesService } from '../../core/services/api-tenant-sales.service';
import { MockAppointment, MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

interface DashboardCalEvent {
  id: string;
  time: string;
  title: string;
  employeeName: string;
  employeeColor: string;
}

interface DashboardCalDay {
  key: string;
  label: string;
  sub: string;
  isToday: boolean;
  events: DashboardCalEvent[];
}

const MESES_CORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const EMPLOYEE_COLORS = ['#2563eb', '#8b5cf6', '#db2777', '#0d9488', '#ea580c', '#4f46e5'];
/** Igual que en demo mock: stock menor que este umbral cuenta como alerta. */
const LOW_STOCK_BELOW = 5;

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function mondayOfWeek(date: Date): Date {
  const now = new Date(date);
  now.setHours(12, 0, 0, 0);
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function parseWhenLocal(when: string): { ymd: string; time: string } | null {
  const s = when.trim();
  let m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?/.exec(s);
  if (m) {
    return { ymd: m[1], time: `${m[2].padStart(2, '0')}:${m[3]}` };
  }
  m = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (m) {
    return { ymd: m[1], time: '—' };
  }
  return null;
}

function readEmployeeIdFromService(service: string): string | null {
  const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(service);
  return m?.[1] ?? null;
}

function cleanServiceLabel(service: string): string {
  return service.replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+/g, '').trim();
}

function parseWhenDate(when: string): Date | null {
  const p = parseWhenLocal(when);
  if (!p) {
    return null;
  }
  const [y, m, d] = p.ymd.split('-').map(Number);
  const [hh, mm] = p.time === '—' ? [0, 0] : p.time.split(':').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function weekRangeLabel(monday: Date): string {
  const sun = new Date(monday);
  sun.setDate(monday.getDate() + 6);
  const yMon = monday.getFullYear();
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()} – ${sun.getDate()} ${MESES_CORT[monday.getMonth()]} ${yMon}`;
  }
  return `${monday.getDate()} ${MESES_CORT[monday.getMonth()]} – ${sun.getDate()} ${MESES_CORT[sun.getMonth()]} ${sun.getFullYear()}`;
}

@Component({
  selector: 'app-tenant-dashboard',
  imports: [RouterLink],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss',
})
export class TenantDashboardComponent {
  @ViewChild('agendaScrollEl') private agendaScrollEl?: ElementRef<HTMLDivElement>;
  readonly dashboardBaseDate = signal(new Date());
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiAppointments = inject(ApiAppointmentsService);
  private readonly apiSales = inject(ApiTenantSalesService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  private readonly apiEmployees = inject(ApiTenantEmployeesService);

  readonly dashboardSalesLive = signal<ApiTenantSaleDto[]>([]);
  readonly dashboardProductsLive = signal<ApiTenantProductDto[]>([]);
  readonly dashboardEmployeesLive = signal<ApiTenantEmployeeDto[]>([]);

  constructor() {
    effect(() => {
      this.dashboardCalendar();
      queueMicrotask(() => this.scrollAgendaToToday());
    });

    effect((onCleanup) => {
      if (!this.apiAppointments.useRemote()) {
        this.dashboardSalesLive.set([]);
        this.dashboardProductsLive.set([]);
        this.dashboardEmployeesLive.set([]);
        return;
      }
      const salesOn = this.session.modules().sales;
      const inventoryOn = this.session.modules().inventory;
      const isTenantAdmin = this.session.role() === 'TENANT_ADMIN';

      const subs: Subscription[] = [];
      if (salesOn) {
        subs.push(
          this.apiSales.list().subscribe({
            next: (rows) => this.dashboardSalesLive.set(rows),
            error: () => this.dashboardSalesLive.set([]),
          }),
        );
      } else {
        this.dashboardSalesLive.set([]);
      }
      if (inventoryOn) {
        subs.push(
          this.apiCatalog.getCatalog().subscribe({
            next: (c) => this.dashboardProductsLive.set(c.products),
            error: () => this.dashboardProductsLive.set([]),
          }),
        );
      } else {
        this.dashboardProductsLive.set([]);
      }
      if (isTenantAdmin) {
        subs.push(
          this.apiEmployees.list().subscribe({
            next: (rows) => this.dashboardEmployeesLive.set(rows),
            error: () => this.dashboardEmployeesLive.set([]),
          }),
        );
      } else {
        this.dashboardEmployeesLive.set([]);
      }
      onCleanup(() => subs.forEach((s) => s.unsubscribe()));
    });
  }

  readonly panelSubtitle = computed(() => {
    const name = this.session.tenantName();
    return this.apiAppointments.useRemote()
      ? `Resumen operativo de ${name}.`
      : `Resumen operativo de ${name} (demo en memoria).`;
  });

  readonly lowStockCount = computed(() => {
    const tid = this.session.tenantId();
    if (!tid || !this.session.modules().inventory) {
      return 0;
    }
    if (this.apiAppointments.useRemote()) {
      return this.dashboardProductsLive().filter((p) => p.stock < LOW_STOCK_BELOW).length;
    }
    return this.data.productsForTenant(tid).filter((p) => p.lowStock).length;
  });

  readonly recentSalesTotalCount = computed(() => {
    if (!this.session.modules().sales) {
      return 0;
    }
    if (this.apiAppointments.useRemote()) {
      return this.dashboardSalesLive().length;
    }
    return this.data.sales().length;
  });

  readonly ventasRecientesLabel = computed(() => {
    if (!this.session.modules().sales) {
      return 'Ventas (módulo inactivo)';
    }
    return this.apiAppointments.useRemote() ? 'Ventas registradas' : 'Ventas recientes (demo)';
  });

  readonly ultimasVentasSectionTitle = computed(() => {
    if (!this.session.modules().sales) {
      return 'Últimas ventas';
    }
    return this.apiAppointments.useRemote() ? 'Últimas ventas registradas' : 'Últimas ventas (demo)';
  });

  readonly dashboardUsesLiveApi = computed(() => this.apiAppointments.useRemote());

  readonly stockAlertsLabel = computed(() =>
    this.session.modules().inventory ? 'Alertas stock bajo' : 'Alertas stock (módulo inventario inactivo)',
  );

  readonly myAppointments = computed(() => {
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

  readonly upcomingAppointments = computed(() => {
    const now = new Date();
    return this.myAppointments()
      .filter((a) => {
        const dt = parseWhenDate(a.when);
        if (!dt || dt < now) {
          return false;
        }
        if (a.status !== 'pendiente') {
          return false;
        }
        return (a.attendance ?? 'PENDIENTE') === 'PENDIENTE';
      })
      .sort((a, b) => {
        const da = parseWhenDate(a.when)?.getTime() ?? 0;
        const db = parseWhenDate(b.when)?.getTime() ?? 0;
        return da - db;
      });
  });

  /** Misma fecha local que usa la vista semanal (no total de citas del tenant). */
  readonly appointmentsTodayCount = computed(() => {
    const todayYmd = toYmdLocal(new Date());
    return this.myAppointments().filter((a) => parseWhenLocal(a.when)?.ymd === todayYmd).length;
  });

  readonly citasHoyKpiLabel = computed(() =>
    this.apiAppointments.useRemote() ? 'Citas hoy' : 'Citas hoy (demo)',
  );

  private readonly employeeColorByName = computed(() => {
    const map = new Map<string, string>();
    const apiEm = this.dashboardEmployeesLive();
    if (this.apiAppointments.useRemote() && this.session.role() === 'TENANT_ADMIN' && apiEm.length) {
      apiEm.forEach((e, idx) => map.set(e.name, EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]));
      return map;
    }
    if (!this.apiAppointments.useRemote()) {
      this.data.employees().forEach((e, idx) => {
        map.set(e.name, EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]);
      });
    }
    return map;
  });

  private employeeForAppointment(appt: MockAppointment): string {
    if (this.apiAppointments.useRemote()) {
      const employeeId = readEmployeeIdFromService(appt.service);
      if (!employeeId) {
        return 'Sin asignar';
      }
      const employees = this.dashboardEmployeesLive();
      const match = employees.find((e) => e.id === employeeId);
      if (match?.name) {
        return match.name;
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

  readonly employeeLegend = computed(() => {
    const colors = this.employeeColorByName();
    const apiEm = this.dashboardEmployeesLive();
    if (this.apiAppointments.useRemote() && apiEm.length) {
      return apiEm.map((e) => ({
        name: e.name,
        color: colors.get(e.name) ?? '#64748b',
      }));
    }
    if (!this.apiAppointments.useRemote()) {
      return this.data.employees().map((e) => ({
        name: e.name,
        color: colors.get(e.name) ?? '#64748b',
      }));
    }
    return [];
  });

  readonly dashboardCalendar = computed(() => {
    const monday = mondayOfWeek(this.dashboardBaseDate());
    const dowLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const todayYmd = toYmdLocal(new Date());
    const colorMap = this.employeeColorByName();

    const days: DashboardCalDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ymdStr = toYmdLocal(d);
      const events = this.myAppointments()
        .map((a) => ({ a, p: parseWhenLocal(a.when) }))
        .filter(({ p }) => p && p.ymd === ymdStr)
        .sort((x, y) => x.a.when.localeCompare(y.a.when))
        .map(({ a, p }) => {
          const employeeName = this.employeeForAppointment(a);
          return {
            id: a.id,
            time: p!.time,
            title: `${a.customer} · ${cleanServiceLabel(a.service)}`,
            employeeName,
            employeeColor: colorMap.get(employeeName) ?? '#64748b',
          };
        });

      days.push({
        key: ymdStr,
        label: dowLabels[i],
        sub: String(d.getDate()),
        isToday: ymdStr === todayYmd,
        events,
      });
    }

    return {
      weekLabel: weekRangeLabel(monday),
      total: days.reduce((acc, day) => acc + day.events.length, 0),
      days,
    };
  });

  readonly dashboardGridTemplate = computed(() =>
    this.dashboardCalendar()
      .days.map((d) => (d.events.length ? 'minmax(150px, 1fr)' : 'minmax(92px, 0.62fr)'))
      .join(' '),
  );

  readonly dashboardBoardMinWidth = computed(() =>
    Math.max(860, this.dashboardCalendar().days.reduce((acc, d) => acc + (d.events.length ? 150 : 92), 0)),
  );

  private scrollAgendaToToday(): void {
    const host = this.agendaScrollEl?.nativeElement;
    if (!host) {
      return;
    }
    const todayEl = host.querySelector('.agenda-day.today') as HTMLElement | null;
    if (todayEl) {
      todayEl.scrollIntoView({ block: 'nearest', inline: 'center' });
      return;
    }
    host.scrollLeft = 0;
  }

  shiftDashboardByDays(deltaDays: number): void {
    this.dashboardBaseDate.update((d) => addDays(d, deltaDays));
  }

  resetDashboardToToday(): void {
    this.dashboardBaseDate.set(new Date());
  }

  displayServiceLabel(service: string): string {
    return cleanServiceLabel(service);
  }
}
