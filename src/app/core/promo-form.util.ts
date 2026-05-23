import type { FormBuilder, FormGroup } from '@angular/forms';
import type { CatalogPromoFields, PromoScheduleType } from './promo-schedule.util';
import { inferPromoFieldsFromLegacy, normalizePromoFields } from './promo-schedule.util';

export interface PromoScheduleFormValue {
  promoEnabled: boolean;
  promoPrice: number | null;
  promoScheduleType: PromoScheduleType;
  promoDays: number[];
  promoStartDate: string;
  promoEndDate: string;
}

export const PROMO_WEEKDAY_OPTIONS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'M' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
] as const;

export function createPromoScheduleFormGroup(fb: FormBuilder): FormGroup {
  return fb.nonNullable.group({
    promoEnabled: [false],
    promoPrice: [null as number | null],
    promoScheduleType: ['always' as PromoScheduleType],
    promoDays: [[] as number[]],
    promoStartDate: [''],
    promoEndDate: [''],
  });
}

export function defaultPromoScheduleFormValue(): PromoScheduleFormValue {
  return {
    promoEnabled: false,
    promoPrice: null,
    promoScheduleType: 'always',
    promoDays: [],
    promoStartDate: '',
    promoEndDate: '',
  };
}

export function promoFormValueFromCatalog(
  item: Partial<CatalogPromoFields> & {
    promoPrice?: number | null;
    promoLabel?: string | null;
  },
): PromoScheduleFormValue {
  const normalized =
    item.promoEnabled != null
      ? normalizePromoFields(item)
      : inferPromoFieldsFromLegacy(item.promoPrice ?? null, item.promoLabel ?? null);
  return {
    promoEnabled: normalized.promoEnabled,
    promoPrice: normalized.promoPrice,
    promoScheduleType: normalized.promoScheduleType ?? 'always',
    promoDays: normalized.promoDays,
    promoStartDate: normalized.promoStartDate ?? '',
    promoEndDate: normalized.promoEndDate ?? '',
  };
}

export function promoPayloadFromFormValue(
  value: PromoScheduleFormValue,
): CatalogPromoFields {
  return normalizePromoFields({
    promoEnabled: value.promoEnabled,
    promoPrice: value.promoPrice,
    promoScheduleType: value.promoScheduleType,
    promoDays: value.promoDays,
    promoStartDate: value.promoStartDate || null,
    promoEndDate: value.promoEndDate || null,
  });
}

export function togglePromoDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b);
}

export function setPromoDayPreset(preset: 'weekdays' | 'weekend' | 'all'): number[] {
  if (preset === 'weekdays') {
    return [1, 2, 3, 4, 5];
  }
  if (preset === 'weekend') {
    return [0, 6];
  }
  return [0, 1, 2, 3, 4, 5, 6];
}
