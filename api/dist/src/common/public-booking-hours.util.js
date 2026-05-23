"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultWeeklyBusinessHours = defaultWeeklyBusinessHours;
exports.weeklyHoursToJson = weeklyHoursToJson;
exports.parseWeeklyHoursJson = parseWeeklyHoursJson;
exports.slotsForPublicBookingDate = slotsForPublicBookingDate;
exports.latestClosingMinuteForDate = latestClosingMinuteForDate;
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const JS_TO_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function defaultWeeklyBusinessHours() {
    const ranges = [{ open: '09:00', close: '20:00' }];
    return {
        mon: [...ranges],
        tue: [...ranges],
        wed: [...ranges],
        thu: [...ranges],
        fri: [...ranges],
        sat: [...ranges],
    };
}
function weeklyHoursToJson(h) {
    return JSON.stringify(h);
}
function parseWeeklyHoursJson(raw) {
    if (raw == null || String(raw).trim() === '') {
        return null;
    }
    try {
        const data = JSON.parse(String(raw));
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return null;
        }
        const out = {};
        for (const day of DAY_ORDER) {
            const v = data[day];
            if (!Array.isArray(v) || v.length === 0) {
                continue;
            }
            const ranges = [];
            for (const item of v) {
                if (!item || typeof item !== 'object') {
                    continue;
                }
                const o = item;
                const open = String(o.open ?? '').trim();
                const close = String(o.close ?? '').trim();
                if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(open) ||
                    !/^([01]?\d|2[0-3]):[0-5]\d$/.test(close)) {
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
    }
    catch {
        return null;
    }
}
function timeToMinutes(t) {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim());
    if (!m) {
        return null;
    }
    return Number(m[1]) * 60 + Number(m[2]);
}
function minutesToSlot(mins) {
    const h = Math.floor(mins / 60);
    const mm = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function dayCodeForYmd(dateYmd) {
    const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());
    if (!p) {
        return null;
    }
    const y = Number(p[1]);
    const mo = Number(p[2]);
    const d = Number(p[3]);
    const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (dt.getFullYear() !== y ||
        dt.getMonth() !== mo - 1 ||
        dt.getDate() !== d) {
        return null;
    }
    return JS_TO_DAY[dt.getDay()];
}
function slotsForPublicBookingDate(weekly, dateYmd, now, stepMinutes = 30) {
    const effective = weekly && Object.keys(weekly).length
        ? weekly
        : defaultWeeklyBusinessHours();
    const day = dayCodeForYmd(dateYmd);
    if (!day) {
        return [];
    }
    const ranges = effective[day];
    if (!ranges?.length) {
        return [];
    }
    const slotSet = new Set();
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
function latestClosingMinuteForDate(weekly, dateYmd) {
    const effective = weekly && Object.keys(weekly).length
        ? weekly
        : defaultWeeklyBusinessHours();
    const day = dayCodeForYmd(dateYmd);
    if (!day) {
        return null;
    }
    const ranges = effective[day];
    if (!ranges?.length) {
        return null;
    }
    let maxClose = null;
    for (const { close } of ranges) {
        const cMin = timeToMinutes(close);
        if (cMin != null && (maxClose == null || cMin > maxClose)) {
            maxClose = cMin;
        }
    }
    return maxClose;
}
function ymdFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
//# sourceMappingURL=public-booking-hours.util.js.map