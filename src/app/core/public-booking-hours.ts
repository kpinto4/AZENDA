/** Misma convención que el API (`api/src/common/public-booking-hours.util.ts`). */
export type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type TimeRange = { open: string; close: string };

export type WeeklyBusinessHours = Partial<Record<DayCode, TimeRange[]>>;

export const DAY_CODES: DayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<DayCode, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const DAY_SHORT_LABELS: Record<DayCode, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom',
};

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
    for (const day of DAY_CODES) {
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
        const open = String(o['open'] ?? '').trim();
        const close = String(o['close'] ?? '').trim();
        if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(close)) {
          continue;
        }
        const [oh, om] = open.split(':').map(Number);
        const [ch, cm] = close.split(':').map(Number);
        if (oh * 60 + om >= ch * 60 + cm) {
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

export function weeklyHoursToJson(h: WeeklyBusinessHours): string {
  return JSON.stringify(h);
}
