import type { MockAppointment } from '../../core/services/mock-data.service';
import { formatServiceForClientMessage } from '../../core/service-label-display.util';
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
  const withoutEmp = service.replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+/g, '').trim();
  if (!withoutEmp.includes(' || ')) {
    return withoutEmp;
  }
  return withoutEmp
    .split(' || ')
    .map((part) => part.split(' · ')[0]?.trim() || part.trim())
    .filter(Boolean)
    .join(' + ');
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

export function appointmentStartMs(when: string): number | null {
  const p = parseWhenLocal(when);
  if (!p || p.time === '—') {
    return null;
  }
  const [y, mo, d] = p.ymd.split('-').map(Number);
  const [hh, mm] = p.time.split(':').map(Number);
  const dt = new Date(y, (mo ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt.getTime();
}

/** Cita activa en agenda: no cancelada y hora de inicio aún no pasó. */
export function isCalendarVisibleAppointment(a: MockAppointment, nowMs = Date.now()): boolean {
  if (a.status === 'cancelada') {
    return false;
  }
  const ms = appointmentStartMs(a.when);
  return ms != null && ms > nowMs;
}

/** Pasó la hora y falta cerrar asistencia. */
export function isPendingAttendanceClosure(a: MockAppointment, nowMs = Date.now()): boolean {
  if (a.status === 'cancelada' || (a.attendance ?? 'PENDIENTE') !== 'PENDIENTE') {
    return false;
  }
  const ms = appointmentStartMs(a.when);
  return ms != null && ms <= nowMs;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Citas útiles en la tabla operativa (no historial completo). */
export function isTableRelevantAppointment(
  a: MockAppointment,
  nowMs = Date.now(),
  historyDays = 14,
): boolean {
  if (isCalendarVisibleAppointment(a, nowMs)) {
    return true;
  }
  if (isPendingAttendanceClosure(a, nowMs)) {
    return true;
  }
  const ms = appointmentStartMs(a.when);
  if (ms == null) {
    return false;
  }
  const cutoff = nowMs - historyDays * MS_PER_DAY;
  return ms >= cutoff;
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

export interface WaReminderMessageInput {
  customerName: string;
  service: string;
  when: string;
  businessName: string;
  employeeName?: string | null;
}

function firstNameFromCustomer(full: string): string {
  const trimmed = full.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Omite ids técnicos (p. ej. EmpleadoId en API) del texto al cliente. */
export function isTechnicalEmployeeLabel(value: string): boolean {
  const v = value.trim();
  if (!v || v === 'Sin asignar') {
    return true;
  }
  return /^[A-Za-z0-9_-]{12,}$/.test(v) && !/\s/.test(v);
}

/** Fecha y hora legibles para WhatsApp; usa «hoy» / «mañana» cuando aplica. */
export function formatWhenForWaReminder(when: string, now = new Date()): string {
  const p = parseWhenLocal(when);
  if (!p) {
    return when;
  }
  if (p.time === '—') {
    return formatWhenDisplay(when);
  }
  const [y, mo, d] = p.ymd.split('-').map(Number);
  const date = new Date(y, (mo ?? 1) - 1, d ?? 1);
  const todayY = toYmdLocal(now);
  const tomorrowY = toYmdLocal(addDays(startOfDay(now), 1));
  const month = MESES_LARGOS[(mo ?? 1) - 1]?.toLowerCase() ?? '';
  const dow = DOW_LABELS[date.getDay()]?.toLowerCase() ?? '';
  const datePart = `${dow} ${d} de ${month}`;

  if (p.ymd === todayY) {
    return `hoy, ${datePart} a las ${p.time}`;
  }
  if (p.ymd === tomorrowY) {
    return `mañana, ${datePart} a las ${p.time}`;
  }
  return `${datePart} de ${y} a las ${p.time}`;
}

/** Texto del recordatorio manual al cliente (wa.me desde el panel). */
export function buildWaReminderMessage(input: WaReminderMessageInput): string {
  const biz = input.businessName.trim() || 'Tu negocio';
  const name = firstNameFromCustomer(input.customerName);
  const greeting = name ? `¡Hola, ${name}!` : '¡Hola!';
  const whenLine = formatWhenForWaReminder(input.when);
  const serviceLine = formatServiceForClientMessage(input.service, input.when);

  const lines = [
    greeting,
    '',
    `Te escribimos desde ${biz} para recordarte tu cita:`,
    '',
    `Cuándo: ${whenLine}`,
    `Servicio: ${serviceLine}`,
  ];

  const employee = input.employeeName?.trim();
  if (employee && !isTechnicalEmployeeLabel(employee)) {
    lines.push(`Profesional: ${employee}`);
  }

  lines.push(
    '',
    'Si necesitas cambiar la hora o cancelar, responde a este mensaje y con gusto te ayudamos.',
    '',
    '¡Te esperamos!',
    biz,
  );

  return lines.join('\n');
}

/** Mensaje del cliente al negocio tras reservar (enlace wa.me en pantalla de éxito). */
export function buildWaClientBookingFollowUpMessage(input: {
  businessName: string;
  customerName: string;
  service: string;
  when: string;
  baseMessage?: string | null;
}): string {
  const biz = input.businessName.trim() || 'el negocio';
  const intro = (
    input.baseMessage?.trim() || `Hola, acabo de reservar en la web de ${biz}.`
  ).trim();
  const whenLine = formatWhenForWaReminder(input.when);
  const serviceLine = formatServiceForClientMessage(input.service, input.when);
  const name = input.customerName.trim();

  const lines = [intro, '', `Cuándo: ${whenLine}`, `Servicio: ${serviceLine}`];
  if (name) {
    lines.push(`Nombre: ${name}`);
  }
  lines.push('', 'Quedo atento/a a cualquier confirmación. ¡Gracias!');
  return lines.join('\n');
}

export function buildWaMeLink(phoneDigits: string, message: string): string {
  const digits = phoneDigits.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
