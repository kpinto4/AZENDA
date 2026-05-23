import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiAppointmentsService, mapApiAppointmentToMock } from '../../core/services/api-appointments.service';
import { ApiTenantCatalogService, ApiTenantProductDto } from '../../core/services/api-tenant-catalog.service';
import type { ApiTenantEmployeeDto } from '../../core/services/api-tenant-employees.service';
import { ApiTenantEmployeesService } from '../../core/services/api-tenant-employees.service';
import { ApiTenantSaleDto, ApiTenantSalesService } from '../../core/services/api-tenant-sales.service';
import { MockAppointment, MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { AgendaCalendarComponent } from '../../shared/agenda/agenda-calendar.component';
import type { AgendaCalendarEvent } from '../../shared/agenda/agenda-calendar.types';
import {
  DOW_LABELS,
  MESES_CORT,
  addDays,
  cleanServiceLabel,
  isCalendarVisibleAppointment,
  parseWhenLocal,
  readEmployeeIdFromService,
  toYmdLocal,
} from '../../shared/agenda/agenda-calendar.utils';
import { AppointmentDetailSheetComponent } from '../../shared/agenda/appointment-detail-sheet.component';

interface DashboardDayBar {
  ymd: string;
  dayShort: string;
  count: number;
  barHeightPct: number;
}

interface DashboardLowStockAlert {
  id: string;
  name: string;
  stock: number;
}

const EMPLOYEE_COLORS = ['#2563eb', '#8b5cf6', '#db2777', '#0d9488', '#ea580c', '#4f46e5'];
export const DASHBOARD_LOW_STOCK_BELOW = 5;
const LOW_STOCK_BELOW = DASHBOARD_LOW_STOCK_BELOW;

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

@Component({
  selector: 'app-tenant-dashboard',
  imports: [RouterLink, AgendaCalendarComponent, AppointmentDetailSheetComponent],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss',
})
export class TenantDashboardComponent {
  readonly lowStockMinimum = LOW_STOCK_BELOW;
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  readonly apiAppointments = inject(ApiAppointmentsService);
  private readonly apiSales = inject(ApiTenantSalesService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  private readonly apiEmployees = inject(ApiTenantEmployeesService);

  readonly dashboardSalesLive = signal<ApiTenantSaleDto[]>([]);
  readonly dashboardProductsLive = signal<ApiTenantProductDto[]>([]);
  readonly dashboardEmployeesLive = signal<ApiTenantEmployeeDto[]>([]);

  readonly sheetOpen = signal(false);
  readonly sheetMode = signal<'detail' | 'day-list'>('detail');
  readonly sheetAppointment = signal<MockAppointment | null>(null);
  readonly sheetDayEvents = signal<AgendaCalendarEvent[]>([]);
  readonly sheetDayLabel = signal('');

  constructor() {
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

  /** Misma regla que /app/citas: solo futuras y no canceladas. */
  readonly calendarAppointments = computed(() =>
    this.myAppointments().filter((a) => isCalendarVisibleAppointment(a)),
  );

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

  readonly appointmentsTodayCount = computed(() => {
    const todayYmd = toYmdLocal(new Date());
    return this.calendarAppointments().filter((a) => parseWhenLocal(a.when)?.ymd === todayYmd).length;
  });

  readonly citasHoyKpiLabel = computed(() =>
    this.apiAppointments.useRemote() ? 'Citas hoy' : 'Citas hoy (demo)',
  );

  readonly last7DaysChart = computed((): DashboardDayBar[] => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const rows: { ymd: string; dayShort: string; count: number }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = addDays(today, -offset);
      const ymd = toYmdLocal(d);
      const count = this.myAppointments().filter((a) => {
        if (a.status === 'cancelada') {
          return false;
        }
        return parseWhenLocal(a.when)?.ymd === ymd;
      }).length;
      const dayShort =
        offset === 0 ? 'Hoy' : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
      rows.push({ ymd, dayShort, count });
    }
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({
      ...r,
      barHeightPct: r.count === 0 ? 0 : Math.max(12, Math.round((r.count / max) * 100)),
    }));
  });

  readonly last7DaysChartSummary = computed(() => {
    const total = this.last7DaysChart().reduce((acc, d) => acc + d.count, 0);
    return `${total} cita(s) en los últimos 7 días`;
  });

  readonly lowStockAlerts = computed((): DashboardLowStockAlert[] => {
    if (!this.session.modules().inventory) {
      return [];
    }
    const tid = this.session.tenantId();
    if (!tid) {
      return [];
    }
    if (this.apiAppointments.useRemote()) {
      return this.dashboardProductsLive()
        .filter((p) => p.stock < LOW_STOCK_BELOW)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, stock: p.stock }));
    }
    return this.data
      .productsForTenant(tid)
      .filter((p) => p.lowStock || p.stock < LOW_STOCK_BELOW)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 3)
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock }));
  });

  readonly primaryLowStockAlert = computed(() => this.lowStockAlerts()[0] ?? null);

  readonly employeeColorMap = computed(() => {
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
    for (const a of this.calendarAppointments()) {
      const name = this.employeeForAppointment(a);
      if (!map.has(name)) {
        map.set(name, EMPLOYEE_COLORS[map.size % EMPLOYEE_COLORS.length]);
      }
    }
    return map;
  });

  readonly sheetEmployeeName = computed(() => {
    const a = this.sheetAppointment();
    return a ? this.employeeForAppointment(a) : '';
  });

  readonly employeeResolver = (a: MockAppointment) => this.employeeForAppointment(a);

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

  private formatDayLabel(ymd: string): string {
    const [y, mo, d] = ymd.split('-').map(Number);
    const date = new Date(y, (mo ?? 1) - 1, d ?? 1);
    return `${DOW_LABELS[date.getDay()]} ${d} ${MESES_CORT[(mo ?? 1) - 1]} ${y}`;
  }

  displayServiceLabel(service: string): string {
    return cleanServiceLabel(service);
  }
}
