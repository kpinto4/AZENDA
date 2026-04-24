import { HttpErrorResponse } from '@angular/common/http';
import { NgStyle } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiAppointmentsService } from '../../core/services/api-appointments.service';
import {
  ApiPublicMetaService,
  PublicTenantMetaDto,
} from '../../core/services/api-public-meta.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

function tabFromQuery(tab: string | null): 'reserva' | 'asistencia' | 'tienda' | 'catalogo' {
  const t = (tab ?? '').toLowerCase();
  if (t === 'asistencia' || t === 'tienda' || t === 'catalogo') {
    return t;
  }
  return 'reserva';
}

@Component({
  selector: 'app-public-booking-page',
  imports: [RouterLink, ReactiveFormsModule, NgStyle],
  templateUrl: './public-booking-page.component.html',
  styleUrl: './public-booking-page.component.scss',
})
export class PublicBookingPageComponent {
  protected readonly environment = environment;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiAppointments = inject(ApiAppointmentsService);
  private readonly apiPublic = inject(ApiPublicMetaService);

  readonly publicMeta = signal<PublicTenantMetaDto | null>(null);

  readonly slug = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('slug') ?? 'negocio')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? 'negocio' },
  );

  readonly clientTab = toSignal(
    this.route.queryParamMap.pipe(map((m) => tabFromQuery(m.get('tab')))),
    { initialValue: tabFromQuery(this.route.snapshot.queryParamMap.get('tab')) },
  );

  readonly tenantServices = computed(() =>
    this.data.servicesForBookingSlug(this.slug()),
  );

  readonly catalogoVisible = computed(() => {
    if (environment.useLiveAuth) {
      return this.publicMeta()?.catalogoActivo ?? false;
    }
    const t = this.data.tenantByBookingSlug(this.slug());
    if (!t?.modules.includes('inventario') || !t.modules.includes('ventas')) {
      return false;
    }
    if (t.plan !== 'Pro' && t.plan !== 'Negocio') {
      return false;
    }
    return t.storefrontEnabled !== false;
  });

  /** Productos del negocio de este slug, en el orden definido en el panel Catálogo. */
  readonly catalogProducts = computed(() => this.data.catalogProductsForBookingSlug(this.slug()));
  readonly branding = computed(() => this.data.brandingForBookingSlug(this.slug()));
  readonly styleVars = computed(() =>
    this.data.brandingCssVars(this.branding(), this.session.darkMode()),
  );

  readonly slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];

  step = signal<1 | 2 | 3 | 4>(1);
  readonly done = signal(false);
  readonly bookedWithLiveApi = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly bookingSubmitting = signal(false);
  readonly dateStepError = signal<string | null>(null);
  readonly lastBookingId = signal<string | null>(null);

  readonly attendanceMsg = signal<string | null>(null);
  readonly attendanceErr = signal<string | null>(null);
  readonly attendanceSubmitting = signal(false);

  readonly storeMsg = signal<string | null>(null);
  readonly storeErr = signal<string | null>(null);
  readonly storeSubmitting = signal(false);

  readonly selectedService = signal('');
  readonly selectedDate = signal('');
  readonly selectedSlot = signal('');

  readonly confirmForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
  });

  readonly attendanceForm = this.fb.nonNullable.group({
    appointmentId: ['', Validators.required],
    customer: ['', Validators.required],
  });

  readonly storeForm = this.fb.nonNullable.group({
    customer: ['', Validators.required],
    detail: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => {
        if (!environment.useLiveAuth) {
          this.publicMeta.set(null);
          return;
        }
        this.apiPublic.getMeta(slug).subscribe({
          next: (m) => this.publicMeta.set(m),
          error: () => this.publicMeta.set(null),
        });
      });
    });
  }

  goTab(tab: 'reserva' | 'asistencia' | 'tienda' | 'catalogo'): void {
    const slug = this.slug();
    const q = tab === 'reserva' ? {} : { tab };
    void this.router.navigate(['/reservar', slug], { queryParams: q });
  }

  solicitarProducto(productName: string): void {
    this.storeForm.patchValue({
      customer: '',
      detail: `Interés en producto: ${productName}. Indica tu nombre y envía el registro.`,
    });
    this.goTab('tienda');
  }

  pickService(s: string): void {
    this.selectedService.set(s);
    this.step.set(2);
  }

  continueFromDate(): void {
    if (!this.selectedDate().trim()) {
      this.dateStepError.set('Indica una fecha.');
      return;
    }
    this.dateStepError.set(null);
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
    if (!this.selectedService()) {
      this.bookingError.set('Elige un servicio.');
      return;
    }
    if (!this.selectedSlot()) {
      this.bookingError.set('Elige un horario.');
      return;
    }
    const v = this.confirmForm.getRawValue();
    const when = `${this.selectedDate()} ${this.selectedSlot()}`;
    this.bookingError.set(null);
    if (environment.useLiveAuth) {
      this.bookingSubmitting.set(true);
      this.apiAppointments
        .createPublic(this.slug(), {
          customer: v.name,
          service: this.selectedService(),
          when,
        })
        .subscribe({
          next: (row) => {
            this.bookingSubmitting.set(false);
            this.bookedWithLiveApi.set(true);
            this.lastBookingId.set(row.id);
            this.done.set(true);
          },
          error: (err: unknown) => {
            this.bookingSubmitting.set(false);
            this.bookingError.set(this.formatHttpError(err));
          },
        });
      return;
    }
    this.bookedWithLiveApi.set(false);
    this.data.recordBooking(v.name, this.selectedService(), when, this.slug());
    const list = this.data.appointmentsForBookingSlug(this.slug());
    const created = list[0];
    this.lastBookingId.set(created?.id ?? null);
    this.done.set(true);
  }

  submitAttendance(): void {
    this.attendanceMsg.set(null);
    this.attendanceErr.set(null);
    if (this.attendanceForm.invalid) {
      this.attendanceForm.markAllAsTouched();
      return;
    }
    const v = this.attendanceForm.getRawValue();
    if (environment.useLiveAuth) {
      this.attendanceSubmitting.set(true);
      this.apiAppointments
        .confirmPublicAttendance(this.slug(), {
          appointmentId: v.appointmentId.trim(),
          customer: v.customer.trim(),
        })
        .subscribe({
          next: () => {
            this.attendanceSubmitting.set(false);
            this.attendanceMsg.set('Asistencia registrada. Gracias.');
            this.attendanceForm.reset({ appointmentId: '', customer: '' });
          },
          error: (err: unknown) => {
            this.attendanceSubmitting.set(false);
            this.attendanceErr.set(this.formatHttpError(err));
          },
        });
      return;
    }
    const ok = this.data.confirmPublicAttendanceMock(
      this.slug(),
      v.appointmentId.trim(),
      v.customer.trim(),
    );
    if (ok) {
      this.attendanceMsg.set('Asistencia registrada (demo en memoria).');
      this.attendanceForm.reset({ appointmentId: '', customer: '' });
    } else {
      this.attendanceErr.set(
        'No coincide referencia y nombre con una cita de este negocio (o la cita está cancelada).',
      );
    }
  }

  submitStore(): void {
    this.storeMsg.set(null);
    this.storeErr.set(null);
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }
    const v = this.storeForm.getRawValue();
    if (environment.useLiveAuth) {
      this.storeSubmitting.set(true);
      this.apiAppointments
        .createPublicStoreVisit(this.slug(), {
          customer: v.customer.trim(),
          detail: v.detail.trim(),
        })
        .subscribe({
          next: () => {
            this.storeSubmitting.set(false);
            this.storeMsg.set('Registro enviado. El negocio lo verá en Ventas.');
            this.storeForm.reset({ customer: '', detail: '' });
          },
          error: (err: unknown) => {
            this.storeSubmitting.set(false);
            this.storeErr.set(this.formatHttpError(err));
          },
        });
      return;
    }
    const t = this.data.tenantByBookingSlug(this.slug());
    if (!t?.modules.includes('ventas')) {
      this.storeErr.set('Este negocio no tiene activado el módulo de ventas en la demo.');
      return;
    }
    this.data.addPublicStoreVisitMock(this.slug(), v.customer.trim(), v.detail.trim());
    this.storeMsg.set('Registro guardado (solo en este navegador, modo demo).');
    this.storeForm.reset({ customer: '', detail: '' });
  }

  back(): void {
    if (this.done()) {
      this.done.set(false);
      this.bookedWithLiveApi.set(false);
      this.step.set(4);
      return;
    }
    this.dateStepError.set(null);
    this.step.update((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
  }

  updateDate(value: string): void {
    this.selectedDate.set(value);
    this.dateStepError.set(null);
  }

  anotherReservation(): void {
    this.done.set(false);
    this.bookedWithLiveApi.set(false);
    this.lastBookingId.set(null);
    this.step.set(1);
    this.selectedService.set('');
    this.selectedDate.set('');
    this.selectedSlot.set('');
    this.confirmForm.reset({ name: '', phone: '' });
    this.bookingError.set(null);
    this.dateStepError.set(null);
  }

  private formatHttpError(err: unknown): string {
    let msg = 'Ha ocurrido un error.';
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message: unknown }).message;
        if (typeof m === 'string') {
          msg = m;
        } else if (Array.isArray(m)) {
          msg = m.map(String).join('; ');
        }
      } else if (err.message) {
        msg = err.message;
      }
    }
    return msg;
  }
}
