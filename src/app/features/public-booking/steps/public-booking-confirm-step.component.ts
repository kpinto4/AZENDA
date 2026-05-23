import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { PublicBookingClientTexts } from '../public-booking.types';

@Component({
  selector: 'app-public-booking-confirm-step',
  encapsulation: ViewEncapsulation.None,
  imports: [ReactiveFormsModule],
  styleUrl: '../public-booking-page.component.scss',
  templateUrl: './public-booking-confirm-step.component.html',
})
export class PublicBookingConfirmStepComponent {
  readonly confirmForm = input.required<FormGroup>();
  readonly bookingError = input<string | null>(null);
  readonly selectedServiceLines = input<string[]>([]);
  readonly hasServices = input(false);
  readonly selectedDate = input('');
  readonly selectedSlot = input('');
  readonly selectedEmployeeLabel = input('');
  readonly bookingClientTexts = input.required<PublicBookingClientTexts>();
  readonly selectedServicePriceLabel = input<string | null>(null);
  readonly totalDurationMinutes = input(0);
  readonly bookingSubmitting = input(false);
  readonly selectedEmployeeId = input('');

  readonly back = output<void>();
  readonly submitConfirm = output<void>();
}
