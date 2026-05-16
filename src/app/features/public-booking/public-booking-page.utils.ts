/** Pestaña cliente desde query `?tab=` (reserva pública). */
export function tabFromQuery(tab: string | null): 'reserva' | 'asistencia' | 'catalogo' {
  const t = (tab ?? '').toLowerCase();
  if (t === 'tienda') {
    return 'catalogo';
  }
  if (t === 'asistencia' || t === 'catalogo') {
    return t;
  }
  return 'reserva';
}

/** Antelación mínima para reprogramar desde «Mis citas» (1,5 h antes del inicio). */
export const LOOKUP_RESCHEDULE_MIN_LEAD_MS = 90 * 60 * 1000;

export function parseLookupWhenToDate(when: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  const hh = m[2].padStart(2, '0');
  const d = new Date(`${m[1]}T${hh}:${m[3]}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function canClientRescheduleLookupAppointment(when: string): boolean {
  const d = parseLookupWhenToDate(when);
  if (!d) {
    return false;
  }
  return d.getTime() - Date.now() >= LOOKUP_RESCHEDULE_MIN_LEAD_MS;
}

export function splitLookupYmdHhmm(when: string): { date: string; slot: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  return { date: m[1], slot: `${m[2].padStart(2, '0')}:${m[3]}` };
}
