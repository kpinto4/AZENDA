const DEFAULT_SERVICE_DURATION_MINUTES = 30;
const MIN_SERVICE_DURATION_MINUTES = 5;
const MAX_SERVICE_DURATION_MINUTES = 480;

/** Intenta leer minutos desde el nombre (ej. «Masaje 60 min»). */
export function inferDurationMinutesFromServiceName(name: string): number {
  const m = /(\d{2,3})\s*min/i.exec(name.trim());
  if (m) {
    const n = Number(m[1]);
    if (n >= MIN_SERVICE_DURATION_MINUTES && n <= MAX_SERVICE_DURATION_MINUTES) {
      return n;
    }
  }
  return DEFAULT_SERVICE_DURATION_MINUTES;
}

export function normalizeServiceDurationMinutes(raw: unknown, nameFallback?: string): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= MIN_SERVICE_DURATION_MINUTES && n <= MAX_SERVICE_DURATION_MINUTES) {
    return Math.round(n);
  }
  if (nameFallback?.trim()) {
    return inferDurationMinutesFromServiceName(nameFallback);
  }
  return DEFAULT_SERVICE_DURATION_MINUTES;
}

/** Duración total de una cita (puede sumar varios servicios). */
export function normalizeTotalBookingDurationMinutes(raw: unknown): number {
  const n = Number(raw);
  const maxTotal = MAX_SERVICE_DURATION_MINUTES * 4;
  if (Number.isFinite(n) && n >= MIN_SERVICE_DURATION_MINUTES && n <= maxTotal) {
    return Math.round(n);
  }
  return DEFAULT_SERVICE_DURATION_MINUTES;
}

export {
  DEFAULT_SERVICE_DURATION_MINUTES,
  MIN_SERVICE_DURATION_MINUTES,
  MAX_SERVICE_DURATION_MINUTES,
};
