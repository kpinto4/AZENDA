import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiAppointmentsService, mapApiAppointmentToMock } from '../../core/services/api-appointments.service';
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

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOfWeek(date: Date): Date {
  const base = new Date(date);
  base.setHours(12, 0, 0, 0);
  const dow = base.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  base.setDate(base.getDate() + diff);
  base.setHours(0, 0, 0, 0);
  return base;
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
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiAppointments = inject(ApiAppointmentsService);
  readonly lowStockCount = computed(() => {
    const tid = this.session.tenantId();
    if (!tid) {
      return 0;
    }
    return this.data.productsForTenant(tid).filter((p) => p.lowStock).length;
  });

  readonly myAppointments = computed(() => {
    if (this.apiAppointments.useRemote()) {
      const slug = this.session.publicBookingSlug();
      return this.apiAppointments.rows().map((row) => mapApiAppointmentToMock(row, slug));
    }
    return this.data.appointmentsForBookingSlug(this.session.publicBookingSlug());
  });

  private readonly employeeColorByName = computed(() => {
    const map = new Map<string, string>();
    this.data.employees().forEach((e, idx) => {
      map.set(e.name, EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]);
    });
    return map;
  });

  private employeeForAppointment(appt: MockAppointment): string {
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
    return this.data.employees().map((e) => ({
      name: e.name,
      color: colors.get(e.name) ?? '#64748b',
    }));
  });

  readonly dashboardCalendar = computed(() => {
    const monday = mondayOfWeek(new Date());
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
            title: `${a.customer} · ${a.service}`,
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
}
