/** Días de la semana (lunes = primer día laboral típico). */
export type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type TimeRange = { open: string; close: string };

export type WeeklyBusinessHours = Partial<Record<DayCode, TimeRange[]>>;

const DAY_ORDER: DayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const JS_TO_DAY: DayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Lun–Sáb 09:00–20:00 una franja; domingo cerrado (similar al mock anterior). */
export function defaultWeeklyBusinessHours(): WeeklyBusinessHours {
  const ranges: TimeRange[] = [{ open: '09:00', close: '20:00' }];
  return {
    mon: [...ranges],
    tue: [...ranges],
    wed: [...ranges],
    thu: [...ranges],
    fri: [...ranges],
    sat: [...ranges],
  };
}

export function weeklyHoursToJson(h: WeeklyBusinessHours): string {
  return JSON.stringify(h);
}

export function parseWeeklyHoursJson(raw: string | null | undefined): WeeklyBusinessHours | null {
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  try {
    const data = JSON.parse(String(raw)) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    const out: WeeklyBusinessHours = {};
    for (const day of DAY_ORDER) {
      const v = (data as Record<string, unknown>)[day];
      if (!Array.isArray(v) || v.length === 0) {
        continue;
      }
      const ranges: TimeRange[] = [];
      for (const item of v) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        const o = item as Record<string, unknown>;
        const open = String(o.open ?? '').trim();
        const close = String(o.close ?? '').trim();
        if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(close)) {
          continue;
        }
        const oMin = timeToMinutes(open);
        const cMin = timeToMinutes(close);
        if (oMin == null || cMin == null || oMin >= cMin) {
          continue;
        }
        ranges.push({ open, close });
      }
      if (ranges.length) {
        out[day] = ranges;
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

function timeToMinutes(t: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim());
  if (!m) {
    return null;
  }
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToSlot(mins: number): string {
  const h = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function dayCodeForYmd(dateYmd: string): DayCode | null {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());
  if (!p) {
    return null;
  }
  const y = Number(p[1]);
  const mo = Number(p[2]);
  const d = Number(p[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return JS_TO_DAY[dt.getDay()];
}

/**
 * Slots HH:mm cada `stepMinutes` dentro de las franjas del día (unión ordenada).
 * Si `dateYmd` es hoy, elimina slots ya pasados (misma lógica que el listado público anterior).
 */
export function slotsForPublicBookingDate(
  weekly: WeeklyBusinessHours | null,
  dateYmd: string,
  now: Date,
  stepMinutes = 30,
): string[] {
  const effective = weekly && Object.keys(weekly).length ? weekly : defaultWeeklyBusinessHours();
  const day = dayCodeForYmd(dateYmd);
  if (!day) {
    return [];
  }
  const ranges = effective[day];
  if (!ranges?.length) {
    return [];
  }
  const slotSet = new Set<string>();
  for (const { open, close } of ranges) {
    const start = timeToMinutes(open);
    const end = timeToMinutes(close);
    if (start == null || end == null || start >= end) {
      continue;
    }
    for (let m = start; m < end; m += stepMinutes) {
      if (m + stepMinutes > end) {
        break;
      }
      slotSet.add(minutesToSlot(m));
    }
  }
  const slots = [...slotSet].sort();
  const todayStr = ymdFromDate(now);
  if (dateYmd !== todayStr) {
    return slots;
  }
  const hh = now.getHours();
  const mm = now.getMinutes();
  const nowM = hh * 60 + mm;
  return slots.filter((slot) => {
    const sm = timeToMinutes(slot);
    return sm != null && sm > nowM;
  });
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
