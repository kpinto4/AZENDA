"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ymdFromWhen = ymdFromWhen;
exports.parseLegacyPromoDays = parseLegacyPromoDays;
exports.buildPromoSummaryLabel = buildPromoSummaryLabel;
exports.parsePromoDaysJson = parsePromoDaysJson;
exports.serializePromoDays = serializePromoDays;
exports.isPromoActiveForDate = isPromoActiveForDate;
exports.effectiveCatalogPrice = effectiveCatalogPrice;
exports.normalizePromoFields = normalizePromoFields;
exports.inferPromoFieldsFromLegacy = inferPromoFieldsFromLegacy;
const DAY_TO_NUM = {
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
const WEEKDAY_FULL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function normalizeDayText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
function ymdFromWhen(when) {
    const s = when.trim();
    const m = /^(\d{4}-\d{2}-\d{2})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.exec(s) ??
        /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(s);
    return m?.[1] ?? null;
}
function dayOfWeekFromYmd(ymd) {
    const [y, mo, d] = ymd.split('-').map(Number);
    if (!y || !mo || !d) {
        return null;
    }
    const date = new Date(y, mo - 1, d);
    return Number.isNaN(date.getTime()) ? null : date.getDay();
}
function resolveDayToken(token) {
    return DAY_TO_NUM[normalizeDayText(token.trim())] ?? null;
}
function parseLegacyPromoDays(promoLabel) {
    const conditions = promoLabel?.trim();
    if (!conditions) {
        return [0, 1, 2, 3, 4, 5, 6];
    }
    const normalized = normalizeDayText(conditions);
    const rangeMatch = /\b(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\s+a\s+(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\b/i.exec(normalized);
    if (!rangeMatch) {
        return [0, 1, 2, 3, 4, 5, 6];
    }
    const start = resolveDayToken(rangeMatch[1]);
    const end = resolveDayToken(rangeMatch[2]);
    if (start == null || end == null) {
        return [0, 1, 2, 3, 4, 5, 6];
    }
    const days = [];
    if (start <= end) {
        for (let d = start; d <= end; d++) {
            days.push(d);
        }
    }
    else {
        for (let d = start; d <= 6; d++) {
            days.push(d);
        }
        for (let d = 0; d <= end; d++) {
            days.push(d);
        }
    }
    return days;
}
function buildPromoSummaryLabel(fields) {
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
function parsePromoDaysJson(raw) {
    if (!raw?.trim()) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((v) => Number(v))
            .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    }
    catch {
        return [];
    }
}
function serializePromoDays(days) {
    const normalized = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
    return normalized.length ? JSON.stringify(normalized) : null;
}
function isPromoActiveForDate(fields, when) {
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
function effectiveCatalogPrice(basePrice, fields, when) {
    const base = Math.max(0, Number(basePrice) || 0);
    const promo = fields.promoPrice != null ? Math.max(0, Number(fields.promoPrice) || 0) : null;
    if (promo != null && isPromoActiveForDate(fields, when)) {
        return promo;
    }
    return base;
}
function normalizePromoFields(input) {
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
    const promoPrice = input.promoPrice == null ? null : Math.max(0, Number(input.promoPrice) || 0);
    const scheduleType = input.promoScheduleType ?? 'always';
    const promoDays = scheduleType === 'weekdays'
        ? [...new Set((input.promoDays ?? []).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
        : [];
    const fields = {
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
function inferPromoFieldsFromLegacy(promoPrice, promoLabel) {
    if (promoPrice == null) {
        return normalizePromoFields({ promoEnabled: false });
    }
    const legacyDays = parseLegacyPromoDays(promoLabel);
    const hasWeekdayRule = !!promoLabel?.trim() &&
        /\b(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\s+a\s+/i.test(promoLabel);
    return normalizePromoFields({
        promoEnabled: true,
        promoPrice,
        promoScheduleType: hasWeekdayRule ? 'weekdays' : 'always',
        promoDays: hasWeekdayRule ? legacyDays : [],
        promoLabel: promoLabel?.trim() || null,
    });
}
//# sourceMappingURL=promo-schedule.util.js.map