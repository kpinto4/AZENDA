import { Component, input, output, ViewEncapsulation } from '@angular/core';
import type { PublicBookingServiceRow } from '../public-booking.types';

@Component({
  selector: 'app-public-booking-service-step',
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../public-booking-page.component.scss',
  templateUrl: './public-booking-service-step.component.html',
})
export class PublicBookingServiceStepComponent {
  readonly serviceRows = input.required<PublicBookingServiceRow[]>();
  readonly selectedService = input('');
  readonly pickService = output<string>();
}
