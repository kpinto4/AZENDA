export type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TimeRange = {
    open: string;
    close: string;
};
export type WeeklyBusinessHours = Partial<Record<DayCode, TimeRange[]>>;
export declare function defaultWeeklyBusinessHours(): WeeklyBusinessHours;
export declare function weeklyHoursToJson(h: WeeklyBusinessHours): string;
export declare function parseWeeklyHoursJson(raw: string | null | undefined): WeeklyBusinessHours | null;
export declare function slotsForPublicBookingDate(weekly: WeeklyBusinessHours | null, dateYmd: string, now: Date, stepMinutes?: number): string[];
