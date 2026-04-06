import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockAppointment, MockDataService } from '../../core/services/mock-data.service';

/** Vista semanal simulada solo para demo visual (sin lógica de fechas real). */
export interface CalSimDay {
  key: string;
  label: string;
  sub: string;
  events: { id: string; title: string; time: string; tone: 'primary' | 'accent' | 'neutral' }[];
}

@Component({
  selector: 'app-tenant-appointments',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-appointments.component.html',
  styleUrl: './tenant-appointments.component.scss',
})
export class TenantAppointmentsComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);

  readonly calSimWeekLabel = '7 – 11 abr 2026';

  readonly calSimDays: CalSimDay[] = [
    {
      key: 'mon',
      label: 'Lun',
      sub: '7',
      events: [
        { id: 'e1', title: 'Ana G. · Corte', time: '10:00', tone: 'primary' },
        { id: 'e2', title: 'Luis M. · Barba', time: '11:30', tone: 'neutral' },
      ],
    },
    {
      key: 'tue',
      label: 'Mar',
      sub: '8',
      events: [{ id: 'e3', title: 'Elena R. · Tinte', time: '09:00', tone: 'accent' }],
    },
    {
      key: 'wed',
      label: 'Mié',
      sub: '9',
      events: [
        { id: 'e4', title: 'Libre mañana', time: '09:00 – 12:00', tone: 'neutral' },
        { id: 'e5', title: 'Cliente demo', time: '12:00', tone: 'primary' },
      ],
    },
    {
      key: 'thu',
      label: 'Jue',
      sub: '10',
      events: [{ id: 'e6', title: 'Mantenimiento', time: 'Todo el día', tone: 'neutral' }],
    },
    {
      key: 'fri',
      label: 'Vie',
      sub: '11',
      events: [
        { id: 'e7', title: 'Spa · Masaje 60', time: '16:00', tone: 'accent' },
        { id: 'e8', title: 'Walk-in', time: '17:30', tone: 'primary' },
      ],
    },
  ];

  readonly calSimHours = ['09:00', '10:00', '11:00', '12:00', '13:00'];

  readonly form = this.fb.nonNullable.group({
    customer: ['Cliente demo', Validators.required],
    service: ['Corte clásico', Validators.required],
    when: ['2026-04-09 12:00', Validators.required],
  });

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.data.addAppointment({
      customer: v.customer,
      service: v.service,
      when: v.when,
      status: 'pendiente',
    });
    this.form.patchValue({ customer: 'Cliente demo' });
  }

  setStatus(id: string, raw: string): void {
    const status = raw as MockAppointment['status'];
    this.data.setAppointmentStatus(id, status);
  }
}
