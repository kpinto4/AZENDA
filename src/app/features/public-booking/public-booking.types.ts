export const PUBLIC_MULTI_SERVICE_SEPARATOR = ' || ';
export const MAX_SERVICES_PER_BOOKING = 5;

export interface PublicBookingServiceRow {
  id: string;
  name: string;
  description: string | null;
  priceLabel: string | null;
  promoLabel: string | null;
  durationMinutes: number;
  fullValue: string;
}

export interface PublicBookingDayChip {
  isoDate: string;
  dayShort: string;
  dayNum: string;
}

export interface PublicBookingEmployeeOption {
  id: string;
  name: string;
  subtitle: string;
}

export type PublicBookingPeriod = 'manana' | 'tarde' | 'noche';

export interface PublicBookingClientTexts {
  address: string | null;
  mapsUrl: string | null;
  cancellation: string;
  reminder: string;
}
