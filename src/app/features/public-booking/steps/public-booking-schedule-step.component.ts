import { Component, input, output, ViewEncapsulation } from '@angular/core';
import type {
  PublicBookingDayChip,
  PublicBookingEmployeeOption,
  PublicBookingPeriod,
} from '../public-booking.types';

@Component({
  selector: 'app-public-booking-schedule-step',
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../public-booking-page.component.scss',
  templateUrl: './public-booking-schedule-step.component.html',
})
export class PublicBookingScheduleStepComponent {
  readonly rescheduleMode = input(false);
  readonly dayChips = input.required<PublicBookingDayChip[]>();
  readonly selectedDate = input('');
  readonly dateStepError = input<string | null>(null);
  readonly employeeOptions = input.required<PublicBookingEmployeeOption[]>();
  readonly selectedEmployeeId = input('');
  readonly selectedPeriod = input<PublicBookingPeriod>('manana');
  readonly availableSlotsForSelection = input<string[]>([]);
  readonly selectedSlot = input('');
  readonly bookingError = input<string | null>(null);
  readonly bookingSubmitting = input(false);

  readonly updateDate = output<string>();
  readonly pickDateFromChip = output<string>();
  readonly pickEmployee = output<string>();
  readonly setPeriod = output<PublicBookingPeriod>();
  readonly pickSlot = output<string>();
  readonly back = output<void>();
  readonly goToSummary = output<void>();
  readonly submitReschedule = output<void>();
}
