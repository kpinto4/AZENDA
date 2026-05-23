/** Parsea inicio de cita en hora local (misma convención que el front). */
export function parseAppointmentWhenLocal(when: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function appointmentStartMs(when: string): number | null {
  const at = parseAppointmentWhenLocal(when);
  return at ? at.getTime() : null;
}

export function isAppointmentFuture(when: string, nowMs = Date.now()): boolean {
  const ms = appointmentStartMs(when);
  return ms != null && ms > nowMs;
}
