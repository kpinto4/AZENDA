declare const DEFAULT_SERVICE_DURATION_MINUTES = 30;
declare const MIN_SERVICE_DURATION_MINUTES = 5;
declare const MAX_SERVICE_DURATION_MINUTES = 480;
export declare function inferDurationMinutesFromServiceName(name: string): number;
export declare function normalizeServiceDurationMinutes(raw: unknown, nameFallback?: string): number;
export declare function normalizeTotalBookingDurationMinutes(raw: unknown): number;
export { DEFAULT_SERVICE_DURATION_MINUTES, MIN_SERVICE_DURATION_MINUTES, MAX_SERVICE_DURATION_MINUTES, };
