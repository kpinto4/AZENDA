import { Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import type { PublicBookingServiceRow } from '../public-booking.types';
import { MAX_SERVICES_PER_BOOKING } from '../public-booking.types';

@Component({
  selector: 'app-public-booking-service-step',
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../public-booking-page.component.scss',
  templateUrl: './public-booking-service-step.component.html',
})
export class PublicBookingServiceStepComponent {
  readonly serviceRows = input.required<PublicBookingServiceRow[]>();
  readonly selectedServices = input<string[]>([]);
  readonly totalDurationMinutes = input(0);
  readonly totalPriceLabel = input<string | null>(null);
  readonly maxServices = MAX_SERVICES_PER_BOOKING;

  readonly cartRows = computed(() => {
    const selected = new Set(this.selectedServices());
    return this.serviceRows().filter((r) => selected.has(r.fullValue));
  });

  readonly pickService = output<string>();
  readonly removeService = output<string>();
  readonly continueToSchedule = output<void>();

  isInCart(fullValue: string): boolean {
    return this.selectedServices().includes(fullValue);
  }

  canAddMore(): boolean {
    return this.selectedServices().length < this.maxServices;
  }
}
