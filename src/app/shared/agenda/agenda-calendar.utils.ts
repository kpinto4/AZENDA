import type { MockAppointment } from '../../core/services/mock-data.service';
import type { AgendaCalendarDay, AgendaCalendarEvent, AgendaEventTone } from './agenda-calendar.types';

export const MESES_CORT = [
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
] as const;

export const MESES_LARGOS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export const DOW_HEADERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;
export const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Domingo de la semana que contiene `date`. */
export function sundayOfWeekContaining(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function parseWhenLocal(when: string): { ymd: string; time: string } | null {
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

export function readEmployeeIdFromService(service: string): string | null {
  const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(service);
  return m?.[1] ?? null;
}

export function cleanServiceLabel(service: string): string {
  return service.replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+/g, '').trim();
}

export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const yStart = weekStart.getFullYear();
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()} – ${end.getDate()} ${MESES_CORT[weekStart.getMonth()]} ${yStart}`;
  }
  return `${weekStart.getDate()} ${MESES_CORT[weekStart.getMonth()]} – ${end.getDate()} ${MESES_CORT[end.getMonth()]} ${end.getFullYear()}`;
}

function statusTone(status: MockAppointment['status']): AgendaEventTone {
  if (status === 'confirmada') {
    return 'primary';
  }
  if (status === 'pendiente') {
    return 'accent';
  }
  return 'neutral';
}

export function eventTone(a: MockAppointment): AgendaEventTone {
  const att = a.attendance ?? 'PENDIENTE';
  if (att === 'ASISTIO') {
    return 'primary';
  }
  if (att === 'NO_ASISTIO') {
    return 'neutral';
  }
  return statusTone(a.status);
}

export function formatWhenDisplay(when: string): string {
  const p = parseWhenLocal(when);
  if (!p) {
    return when;
  }
  const [y, mo, d] = p.ymd.split('-').map(Number);
  const date = new Date(y, (mo ?? 1) - 1, d ?? 1);
  const dow = DOW_LABELS[date.getDay()];
  return `${dow} ${d} ${MESES_CORT[(mo ?? 1) - 1]} ${y}${p.time !== '—' ? `, ${p.time}` : ''}`;
}

export type EmployeeResolver = (appointment: MockAppointment) => string;

function eventsForYmd(
  ymd: string,
  appointments: MockAppointment[],
  employeeResolver: EmployeeResolver,
  colorMap: Map<string, string>,
): AgendaCalendarEvent[] {
  return appointments
    .map((a) => ({ a, p: parseWhenLocal(a.when) }))
    .filter(({ p }) => p && p.ymd === ymd)
    .sort((x, y) => x.a.when.localeCompare(y.a.when))
    .map(({ a, p }) => {
      const employeeName = employeeResolver(a);
      return {
        id: a.id,
        time: p!.time,
        customer: a.customer,
        serviceLabel: cleanServiceLabel(a.service),
        employeeName,
        employeeColor: colorMap.get(employeeName) ?? '#64748b',
        tone: eventTone(a),
        appointment: a,
      };
    });
}

function dayCell(
  d: Date,
  todayYmd: string,
  monthIndex: number | null,
  appointments: MockAppointment[],
  employeeResolver: EmployeeResolver,
  colorMap: Map<string, string>,
): AgendaCalendarDay {
  const ymdStr = toYmdLocal(d);
  return {
    key: ymdStr,
    label: DOW_LABELS[d.getDay()],
    sub: String(d.getDate()),
    isToday: ymdStr === todayYmd,
    isCurrentMonth: monthIndex === null ? true : d.getMonth() === monthIndex,
    events: eventsForYmd(ymdStr, appointments, employeeResolver, colorMap),
  };
}

export function buildWeekDays(
  anchor: Date,
  appointments: MockAppointment[],
  employeeResolver: EmployeeResolver,
  colorMap: Map<string, string>,
): AgendaCalendarDay[] {
  const weekStart = sundayOfWeekContaining(anchor);
  const todayYmd = toYmdLocal(new Date());
  const days: AgendaCalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(dayCell(addDays(weekStart, i), todayYmd, null, appointments, employeeResolver, colorMap));
  }
  return days;
}

export function buildMonthDays(
  anchor: Date,
  appointments: MockAppointment[],
  employeeResolver: EmployeeResolver,
  colorMap: Map<string, string>,
): AgendaCalendarDay[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const todayYmd = toYmdLocal(new Date());
  const first = new Date(year, month, 1);
  const gridStart = sundayOfWeekContaining(first);
  const days: AgendaCalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(dayCell(addDays(gridStart, i), todayYmd, month, appointments, employeeResolver, colorMap));
  }
  return days;
}

export function monthHasSixRows(days: AgendaCalendarDay[]): boolean {
  return days.slice(35).some((d) => d.isCurrentMonth);
}

export function visibleMonthDays(days: AgendaCalendarDay[]): AgendaCalendarDay[] {
  return monthHasSixRows(days) ? days : days.slice(0, 35);
}
