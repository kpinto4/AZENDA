import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-public-booking-page',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './public-booking-page.component.html',
  styleUrl: './public-booking-page.component.scss',
})
export class PublicBookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockDataService);

  readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? 'negocio');

  readonly services = ['Corte clásico', 'Corte + barba', 'Tinte', 'Tratamiento spa'];
  readonly slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];

  step = signal<1 | 2 | 3 | 4>(1);
  readonly done = signal(false);

  selectedService = signal(this.services[0]);
  selectedDate = signal('2026-04-10');
  selectedSlot = signal(this.slots[2]);

  readonly confirmForm = this.fb.nonNullable.group({
    name: ['Cliente web', Validators.required],
    phone: ['600000000', Validators.required],
  });

  pickService(s: string): void {
    this.selectedService.set(s);
    this.step.set(2);
  }

  continueFromDate(): void {
    this.step.set(3);
  }

  pickSlot(s: string): void {
    this.selectedSlot.set(s);
    this.step.set(4);
  }

  confirm(): void {
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    const v = this.confirmForm.getRawValue();
    const when = `${this.selectedDate()} ${this.selectedSlot()}`;
    this.data.recordBooking(v.name, this.selectedService(), when);
    this.done.set(true);
  }

  back(): void {
    if (this.done()) {
      this.done.set(false);
      this.step.set(4);
      return;
    }
    this.step.update((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
  }

  updateDate(value: string): void {
    this.selectedDate.set(value);
  }
}
