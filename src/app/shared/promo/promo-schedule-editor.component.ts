import { Component, inject, input } from '@angular/core';
import { ControlContainer, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  PROMO_WEEKDAY_OPTIONS,
  setPromoDayPreset,
  togglePromoDay,
  type PromoScheduleFormValue,
} from '../../core/promo-form.util';
import type { PromoScheduleType } from '../../core/promo-schedule.util';

@Component({
  selector: 'app-promo-schedule-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './promo-schedule-editor.component.html',
  styleUrl: './promo-schedule-editor.component.scss',
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class PromoScheduleEditorComponent {
  private readonly controlContainer = inject(ControlContainer);
  readonly groupName = input('promo');

  readonly weekdayOptions = PROMO_WEEKDAY_OPTIONS;

  get promoForm(): FormGroup {
    return this.controlContainer.control!.get(this.groupName()) as FormGroup;
  }

  get enabled(): boolean {
    return !!this.promoForm.get('promoEnabled')?.value;
  }

  get scheduleType(): PromoScheduleType {
    return this.promoForm.get('promoScheduleType')?.value ?? 'always';
  }

  isDaySelected(day: number): boolean {
    const days = (this.promoForm.get('promoDays')?.value ?? []) as number[];
    return days.includes(day);
  }

  onToggleDay(day: number): void {
    const current = (this.promoForm.get('promoDays')?.value ?? []) as number[];
    this.promoForm.patchValue({ promoDays: togglePromoDay(current, day) });
  }

  applyPreset(preset: 'weekdays' | 'weekend' | 'all'): void {
    this.promoForm.patchValue({ promoDays: setPromoDayPreset(preset) });
  }

  setScheduleType(type: PromoScheduleType): void {
    const patch: Partial<PromoScheduleFormValue> = { promoScheduleType: type };
    if (type === 'weekdays' && !(this.promoForm.get('promoDays')?.value as number[])?.length) {
      patch.promoDays = setPromoDayPreset('weekdays');
    }
    this.promoForm.patchValue(patch);
  }
}
