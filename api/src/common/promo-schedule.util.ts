export type PromoScheduleType = 'always' | 'weekdays' | 'date_range';

export interface CatalogPromoFields {
  promoEnabled: boolean;
  promoPrice: number | null;
  promoScheduleType: PromoScheduleType | null;
  promoDays: number[];
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoLabel: string | null;
}

const DAY_TO_NUM: Record<string, number> = {
  domingo: 0,
  dom: 0,
  lunes: 1,
  lun: 1,
  martes: 2,
  mar: 2,
  miercoles: 3,
  mie: 3,
  jueves: 4,
  jue: 4,
  viernes: 5,
  vie: 5,
  sabado: 6,
  sab: 6,
};

const WEEKDAY_FULL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

function normalizeDayText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function ymdFromWhen(when: string): string | null {
  const s = when.trim();
  const m =
    /^(\d{4}-\d{2}-\d{2})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.exec(s) ??
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(s);
  return m?.[1] ?? null;
}

function dayOfWeekFromYmd(ymd: string): number | null {
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!y || !mo || !d) {
    return null;
  }
  const date = new Date(y, mo - 1, d);
  return Number.isNaN(date.getTime()) ? null : date.getDay();
}

function resolveDayToken(token: string): number | null {
  return DAY_TO_NUM[normalizeDayText(token.trim())] ?? null;
}

export function parseLegacyPromoDays(
  promoLabel: string | null | undefined,
): number[] {
  const conditions = promoLabel?.trim();
  if (!conditions) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const normalized = normalizeDayText(conditions);
  const rangeMatch =
    /\b(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\s+a\s+(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\b/i.exec(
      normalized,
    );
  if (!rangeMatch) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const start = resolveDayToken(rangeMatch[1]);
  const end = resolveDayToken(rangeMatch[2]);
  if (start == null || end == null) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const days: number[] = [];
  if (start <= end) {
    for (let d = start; d <= end; d++) {
      days.push(d);
    }
  } else {
    for (let d = start; d <= 6; d++) {
      days.push(d);
    }
    for (let d = 0; d <= end; d++) {
      days.push(d);
    }
  }
  return days;
}

export function buildPromoSummaryLabel(
  fields: CatalogPromoFields,
): string | null {
  if (!fields.promoEnabled || fields.promoPrice == null) {
    return null;
  }
  const type = fields.promoScheduleType ?? 'always';
  if (type === 'always') {
    return 'Promo activa';
  }
  if (type === 'date_range') {
    const start = fields.promoStartDate?.trim();
    const end = fields.promoEndDate?.trim();
    if (start && end) {
      return `Promo del ${start} al ${end}`;
    }
    if (start) {
      return `Promo desde ${start}`;
    }
    if (end) {
      return `Promo hasta ${end}`;
    }
    return 'Promo por fechas';
  }
  const days = [...fields.promoDays].sort((a, b) => a - b);
  if (!days.length) {
    return 'Promo por días';
  }
  if (days.length === 7) {
    return 'Promo todos los días';
  }
  return days.map((d) => WEEKDAY_FULL[d] ?? '?').join(', ');
}

export function parsePromoDaysJson(raw: string | null | undefined): number[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  } catch {
    return [];
  }
}

export function serializePromoDays(days: number[]): string | null {
  const normalized = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort(
    (a, b) => a - b,
  );
  return normalized.length ? JSON.stringify(normalized) : null;
}

export function isPromoActiveForDate(
  fields: Pick<
    CatalogPromoFields,
    | 'promoEnabled'
    | 'promoPrice'
    | 'promoScheduleType'
    | 'promoDays'
    | 'promoStartDate'
    | 'promoEndDate'
    | 'promoLabel'
  >,
  when: string,
): boolean {
  if (!fields.promoEnabled || fields.promoPrice == null) {
    return false;
  }
  const ymd = ymdFromWhen(when);
  if (!ymd) {
    return fields.promoScheduleType === 'always' || !fields.promoScheduleType;
  }

  const type = fields.promoScheduleType ?? 'always';
  if (type === 'date_range') {
    const start = fields.promoStartDate?.trim();
    const end = fields.promoEndDate?.trim();
    if (start && ymd < start) {
      return false;
    }
    if (end && ymd > end) {
      return false;
    }
    return true;
  }

  if (type === 'weekdays') {
    const days = fields.promoDays.length
      ? fields.promoDays
      : parseLegacyPromoDays(fields.promoLabel);
    if (!days.length) {
      return false;
    }
    const dow = dayOfWeekFromYmd(ymd);
    return dow != null && days.includes(dow);
  }

  return true;
}

export function effectiveCatalogPrice(
  basePrice: number,
  fields: Pick<
    CatalogPromoFields,
    | 'promoEnabled'
    | 'promoPrice'
    | 'promoScheduleType'
    | 'promoDays'
    | 'promoStartDate'
    | 'promoEndDate'
    | 'promoLabel'
  >,
  when: string,
): number {
  const base = Math.max(0, Number(basePrice) || 0);
  const promo =
    fields.promoPrice != null
      ? Math.max(0, Number(fields.promoPrice) || 0)
      : null;
  if (promo != null && isPromoActiveForDate(fields, when)) {
    return promo;
  }
  return base;
}

export function normalizePromoFields(input: {
  promoEnabled?: boolean;
  promoPrice?: number | null;
  promoScheduleType?: PromoScheduleType | null;
  promoDays?: number[] | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  promoLabel?: string | null;
}): CatalogPromoFields {
  const enabled = input.promoEnabled === true;
  if (!enabled) {
    return {
      promoEnabled: false,
      promoPrice: null,
      promoScheduleType: null,
      promoDays: [],
      promoStartDate: null,
      promoEndDate: null,
      promoLabel: null,
    };
  }

  const promoPrice =
    input.promoPrice == null
      ? null
      : Math.max(0, Number(input.promoPrice) || 0);
  const scheduleType = input.promoScheduleType ?? 'always';
  const promoDays =
    scheduleType === 'weekdays'
      ? [
          ...new Set((input.promoDays ?? []).filter((d) => d >= 0 && d <= 6)),
        ].sort((a, b) => a - b)
      : [];

  const fields: CatalogPromoFields = {
    promoEnabled: true,
    promoPrice,
    promoScheduleType: scheduleType,
    promoDays,
    promoStartDate: input.promoStartDate?.trim() || null,
    promoEndDate: input.promoEndDate?.trim() || null,
    promoLabel: null,
  };
  fields.promoLabel = buildPromoSummaryLabel(fields);
  return fields;
}

export function inferPromoFieldsFromLegacy(
  promoPrice: number | null,
  promoLabel: string | null,
): CatalogPromoFields {
  if (promoPrice == null) {
    return normalizePromoFields({ promoEnabled: false });
  }
  const legacyDays = parseLegacyPromoDays(promoLabel);
  const hasWeekdayRule =
    !!promoLabel?.trim() &&
    /\b(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\s+a\s+/i.test(
      promoLabel,
    );
  return normalizePromoFields({
    promoEnabled: true,
    promoPrice,
    promoScheduleType: hasWeekdayRule ? 'weekdays' : 'always',
    promoDays: hasWeekdayRule ? legacyDays : [],
    promoLabel: promoLabel?.trim() || null,
  });
}
