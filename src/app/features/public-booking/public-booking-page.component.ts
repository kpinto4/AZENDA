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
  PublicAvailabilityDto,
  PublicCatalogDto,
  PublicTenantMetaDto,
} from '../../core/services/api-public-meta.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { UiAlertService } from '../../core/services/ui-alert.service';

function tabFromQuery(tab: string | null): 'reserva' | 'asistencia' | 'catalogo' {
  const t = (tab ?? '').toLowerCase();
  if (t === 'tienda') {
    return 'catalogo';
  }
  if (t === 'asistencia' || t === 'catalogo') {
    return t;
  }
  return 'reserva';
}

interface PublicBookingServiceRow {
  id: string;
  name: string;
  description: string | null;
  priceLabel: string | null;
  promoLabel: string | null;
  fullValue: string;
}

interface PublicBookingDayChip {
  isoDate: string;
  dayShort: string;
  dayNum: string;
}

interface PublicBookingEmployeeOption {
  id: string;
  name: string;
  subtitle: string;
}

type PublicBookingPeriod = 'manana' | 'tarde' | 'noche';

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
  private readonly alerts = inject(UiAlertService);

  readonly publicMeta = signal<PublicTenantMetaDto | null>(null);
  readonly publicCatalog = signal<PublicCatalogDto | null>(null);
  readonly publicAvailability = signal<PublicAvailabilityDto | null>(null);
  readonly blockedAlertShownForSlug = signal<string | null>(null);

  readonly slug = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('slug') ?? 'negocio')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? 'negocio' },
  );

  readonly clientTab = toSignal(
    this.route.queryParamMap.pipe(map((m) => tabFromQuery(m.get('tab')))),
    { initialValue: tabFromQuery(this.route.snapshot.queryParamMap.get('tab')) },
  );

  readonly tenantServices = computed(() => {
    if (environment.useLiveAuth) {
      const services = this.publicCatalog()?.services ?? [];
      if (services.length) {
        return services.map((s) => {
          const base = `${s.name} · $${Number(s.price).toFixed(2)}`;
          if (s.promoPrice != null) {
            const promo = `$${Number(s.promoPrice).toFixed(2)}`;
            return `${base} · Promo ${promo}${s.promoLabel ? ` (${s.promoLabel})` : ''}`;
          }
          return base;
        });
      }
      // Fallback defensivo: evita bloquear la reserva pública si el catálogo API aún no trae servicios.
      const mockServices = this.data.servicesForBookingSlug(this.slug());
      if (mockServices.length && !mockServices[0].startsWith('Configura tus servicios')) {
        return mockServices;
      }
      return [];
    }
    return this.data.servicesForBookingSlug(this.slug());
  });

  /** Tarjetas enriquecidas para el selector de servicio (API estructurada o texto plano). */
  readonly serviceRows = computed((): PublicBookingServiceRow[] => {
    if (environment.useLiveAuth) {
      const services = this.publicCatalog()?.services ?? [];
      if (services.length) {
        return services.map((s) => {
          const priceLabel = `$${Number(s.price).toFixed(2)}`;
          let promoLabel: string | null = null;
          let full = `${s.name} · ${priceLabel}`;
          if (s.promoPrice != null) {
            const promo = `$${Number(s.promoPrice).toFixed(2)}`;
            promoLabel = s.promoLabel ? `${s.promoLabel} · ${promo}` : `Promo ${promo}`;
            full += ` · Promo ${promo}${s.promoLabel ? ` (${s.promoLabel})` : ''}`;
          }
          return {
            id: s.id,
            name: s.name,
            description: s.description?.trim() ? s.description.trim() : null,
            priceLabel,
            promoLabel,
            fullValue: full,
          };
        });
      }
    }
    return this.tenantServices().map((line, i) => {
      const sep = ' · ';
      const parts = line.split(sep);
      const name = (parts[0] ?? line).trim();
      const tailParts = parts.slice(1);
      const promoAt = tailParts.findIndex((p) => /promo/i.test(p));
      let priceLabel: string | null = null;
      let promoLabel: string | null = null;
      if (promoAt >= 0) {
        priceLabel =
          tailParts
            .slice(0, promoAt)
            .join(sep)
            .trim() || null;
        promoLabel =
          tailParts
            .slice(promoAt)
            .join(sep)
            .trim() || null;
      } else {
        const tail = tailParts.join(sep).trim();
        priceLabel = tail || null;
      }
      return {
        id: `line_${i}`,
        name,
        description: null,
        priceLabel,
        promoLabel,
        fullValue: line,
      };
    });
  });

  /** Mini galería bajo la cabecera (logo + fotos de producto). */
  readonly heroGalleryUrls = computed(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (u: string | null | undefined) => {
      const v = u?.trim();
      if (!v || seen.has(v)) {
        return;
      }
      seen.add(v);
      out.push(v);
    };
    push(this.branding().logoUrl);
    for (const p of this.catalogProducts()) {
      push(p.imageUrl);
      if (out.length >= 10) {
        break;
      }
    }
    return out;
  });

  readonly heroCoverUrl = computed(() => this.heroGalleryUrls()[0] ?? null);
  readonly heroThumbUrls = computed(() => this.heroGalleryUrls().slice(0, 8));
  readonly heroCoverStyle = computed(() => {
    const cover = this.heroCoverUrl();
    if (!cover) {
      return null;
    }
    return {
      backgroundImage: `linear-gradient(15deg, rgb(2 6 23 / 0.35), rgb(2 6 23 / 0.05)), url('${cover}')`,
    };
  });

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
  readonly catalogProducts = computed(() =>
    environment.useLiveAuth
      ? (this.publicCatalog()?.products ?? [])
      : this.data.catalogProductsForBookingSlug(this.slug()),
  );
  readonly branding = computed(() => {
    if (environment.useLiveAuth) {
      const b = this.publicCatalog()?.branding ?? this.publicMeta()?.branding;
      if (b) {
        return {
          displayName: b.displayName,
          logoUrl: b.logoUrl,
          catalogLayout: b.catalogLayout,
          primaryColor: b.primaryColor,
          accentColor: b.accentColor,
          bgColor: b.bgColor,
          surfaceColor: b.surfaceColor,
          textColor: b.textColor,
          borderRadiusPx: b.borderRadiusPx,
          useGradient: b.useGradient,
          gradientFrom: b.gradientFrom,
          gradientTo: b.gradientTo,
          gradientAngleDeg: b.gradientAngleDeg,
        };
      }
    }
    return this.data.brandingForBookingSlug(this.slug());
  });
  readonly catalogLayout = computed(() => this.branding().catalogLayout ?? 'horizontal');
  readonly styleVars = computed(() =>
    this.data.brandingCssVars(this.branding(), this.session.darkMode()),
  );

  readonly slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '15:00', '15:30', '16:00', '16:30', '18:30', '19:00', '19:30'];
  readonly employeeOptions = computed((): PublicBookingEmployeeOption[] => {
    const base: PublicBookingEmployeeOption[] = [
      { id: 'any', name: 'Cualquiera', subtitle: 'Mayor disponibilidad' },
    ];
    if (environment.useLiveAuth) {
      const fromApi = (this.publicCatalog()?.employees ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        subtitle: e.role === 'ADMIN' ? 'Director · Disponible' : 'Profesional · Disponible',
      }));
      if (fromApi.length) {
        return [...base, ...fromApi];
      }
    }
    const fromMock = this.data.employees().map((e) => ({
      id: e.id,
      name: e.name,
      subtitle: e.panelRole === 'ADMIN' ? 'Director · Disponible' : 'Profesional · Disponible',
    }));
    return [...base, ...fromMock];
  });
  readonly selectedEmployeeLabel = computed(
    () =>
      this.employeeOptions().find((e) => e.id === this.selectedEmployeeId())?.name ?? 'Sin seleccionar',
  );
  readonly selectedServicePriceLabel = computed(() => {
    const selected = this.selectedService();
    if (!selected) {
      return null;
    }
    return this.serviceRows().find((s) => s.fullValue === selected)?.priceLabel ?? null;
  });
  readonly selectedPeriod = signal<PublicBookingPeriod>('manana');
  readonly availableSlotsForSelection = computed(() => {
    const period = this.selectedPeriod();
    const date = this.selectedDate().trim();
    let sourceSlots = this.slots;
    if (environment.useLiveAuth && date && this.publicAvailability()?.date === date) {
      const data = this.publicAvailability()!;
      const emp = this.selectedEmployeeId().trim();
      sourceSlots =
        emp && emp !== 'any'
          ? (data.slotsByEmployee[emp] ?? [])
          : data.allSlots;
    }
    return sourceSlots.filter((s) => {
      const hour = Number(s.split(':')[0] ?? 0);
      if (period === 'manana') {
        return hour < 13;
      }
      if (period === 'tarde') {
        return hour >= 13 && hour < 18;
      }
      return hour >= 18;
    });
  });
  readonly dayChips = computed((): PublicBookingDayChip[] => {
    const out: PublicBookingDayChip[] = [];
    const base = new Date();
    const fmtWeek = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayShort = fmtWeek.format(d).replace('.', '');
      const dayNum = String(d.getDate());
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      out.push({ isoDate, dayShort, dayNum });
    }
    return out;
  });
  readonly publicBookingBlockedMessage = computed(() => {
    if (!environment.useLiveAuth) {
      return null;
    }
    const meta = this.publicMeta();
    if (!meta) {
      return null;
    }
    if (!meta.active) {
      return 'Este negocio no acepta reservas publicas en este momento. Contacta al negocio o renueva el plan.';
    }
    if (!meta.modules.citas) {
      return 'Las reservas estan deshabilitadas para este negocio. Contacta al negocio para mas informacion.';
    }
    return null;
  });

  step = signal<1 | 2 | 3>(1);
  readonly done = signal(false);
  readonly bookedWithLiveApi = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly bookingSubmitting = signal(false);
  readonly dateStepError = signal<string | null>(null);
  readonly lastBookingId = signal<string | null>(null);

  readonly attendanceMsg = signal<string | null>(null);
  readonly attendanceErr = signal<string | null>(null);
  readonly attendanceSubmitting = signal(false);

  readonly catalogRequestTarget = signal<string | null>(null);
  readonly catalogRequestMsg = signal<string | null>(null);
  readonly catalogRequestErr = signal<string | null>(null);
  readonly catalogRequestSubmitting = signal(false);

  readonly selectedService = signal('');
  readonly selectedDate = signal('');
  readonly selectedSlot = signal('');
  readonly selectedEmployeeId = signal('');

  readonly confirmForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
  });

  readonly attendanceForm = this.fb.nonNullable.group({
    appointmentId: ['', Validators.required],
    customer: ['', Validators.required],
  });

  readonly catalogRequestForm = this.fb.nonNullable.group({
    customer: ['', Validators.required],
    note: [''],
  });

  readonly showMobileReserveCta = computed(
    () => this.clientTab() !== 'reserva' && !this.done() && !this.bookingSubmitting(),
  );

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
        this.apiPublic.getCatalog(slug).subscribe({
          next: (c) => this.publicCatalog.set(c),
          error: () => this.publicCatalog.set(null),
        });
      });
    });
    effect(() => {
      const slug = this.slug();
      const date = this.selectedDate().trim();
      if (!environment.useLiveAuth || !date) {
        this.publicAvailability.set(null);
        return;
      }
      untracked(() => {
        this.apiPublic.getAvailability(slug, date).subscribe({
          next: (rows) => this.publicAvailability.set(rows),
          error: () => this.publicAvailability.set(null),
        });
      });
    });
    effect(() => {
      const slug = this.slug();
      const blockedMsg = this.publicBookingBlockedMessage();
      if (!blockedMsg) {
        return;
      }
      if (this.blockedAlertShownForSlug() === slug) {
        return;
      }
      this.blockedAlertShownForSlug.set(slug);
      this.alerts.warning(blockedMsg, 'Acceso restringido');
    });
  }

  goTab(tab: 'reserva' | 'asistencia' | 'catalogo'): void {
    const slug = this.slug();
    if (tab !== 'catalogo') {
      this.catalogRequestTarget.set(null);
    }
    const q = tab === 'reserva' ? {} : { tab };
    void this.router.navigate(['/reservar', slug], { queryParams: q }).then(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  jumpToReserve(): void {
    this.goTab('reserva');
  }

  openCatalogRequest(productName: string): void {
    this.catalogRequestMsg.set(null);
    this.catalogRequestErr.set(null);
    this.catalogRequestTarget.set(productName);
    this.catalogRequestForm.reset({ customer: '', note: '' });
  }

  cancelCatalogRequest(): void {
    this.catalogRequestTarget.set(null);
    this.catalogRequestErr.set(null);
  }

  submitCatalogRequest(): void {
    this.catalogRequestMsg.set(null);
    this.catalogRequestErr.set(null);
    const product = this.catalogRequestTarget();
    if (!product) {
      return;
    }
    if (this.catalogRequestForm.invalid) {
      this.catalogRequestForm.markAllAsTouched();
      return;
    }
    const v = this.catalogRequestForm.getRawValue();
    let detail = `Solicitud desde catálogo: «${product}».`;
    const note = v.note.trim();
    if (note) {
      detail += ` Comentario: ${note}`;
    }
    this.sendPublicCatalogRequest(v.customer.trim(), detail);
  }

  pickService(s: string): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
    this.selectedService.set(s);
    this.step.set(2);
  }

  continueToSchedule(): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
    if (!this.selectedDate().trim()) {
      this.dateStepError.set('Indica una fecha.');
      return;
    }
    this.dateStepError.set(null);
    this.step.set(2);
  }

  pickSlot(s: string): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
    this.selectedSlot.set(s);
  }

  pickEmployee(employeeId: string): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
    this.selectedEmployeeId.set(employeeId);
    this.selectedSlot.set('');
  }

  goToSummaryStep(): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
    if (!this.selectedDate().trim()) {
      this.dateStepError.set('Selecciona una fecha.');
      return;
    }
    if (!this.selectedEmployeeId().trim()) {
      this.bookingError.set('Selecciona un profesional.');
      return;
    }
    if (!this.selectedSlot().trim()) {
      this.bookingError.set('Selecciona un horario.');
      return;
    }
    this.dateStepError.set(null);
    this.bookingError.set(null);
    this.step.set(3);
  }

  confirm(): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
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
          employeeId: this.selectedEmployeeId() === 'any' ? undefined : this.selectedEmployeeId(),
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
    const wasCreated = this.data.recordBooking(
      v.name,
      `${this.selectedService()} · Empleado: ${this.selectedEmployeeLabel()}`,
      when,
      this.slug(),
    );
    if (!wasCreated) {
      this.bookingError.set('Ese horario ya está ocupado. Elige otra hora.');
      return;
    }
    const list = this.data.appointmentsForBookingSlug(this.slug());
    const createdRow = list[0];
    this.lastBookingId.set(createdRow?.id ?? null);
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

  /** Envío al mismo endpoint público que el negocio consulta en Ventas (mensaje tipo solicitud cliente). */
  private sendPublicCatalogRequest(customer: string, detail: string): void {
    if (environment.useLiveAuth) {
      this.catalogRequestSubmitting.set(true);
      this.apiAppointments
        .createPublicStoreVisit(this.slug(), {
          customer,
          detail,
        })
        .subscribe({
          next: () => {
            this.catalogRequestSubmitting.set(false);
            this.catalogRequestMsg.set(
              'Solicitud enviada. El negocio la verá en su panel y puede contactarte.',
            );
            this.catalogRequestForm.reset({ customer: '', note: '' });
            this.catalogRequestTarget.set(null);
          },
          error: (err: unknown) => {
            this.catalogRequestSubmitting.set(false);
            this.catalogRequestErr.set(this.formatHttpError(err));
          },
        });
      return;
    }
    const t = this.data.tenantByBookingSlug(this.slug());
    if (!t?.modules.includes('ventas')) {
      this.catalogRequestErr.set('Este negocio no tiene activado el módulo de ventas en la demo.');
      return;
    }
    this.data.addPublicStoreVisitMock(this.slug(), customer, detail);
    this.catalogRequestMsg.set('Solicitud guardada en esta demo del navegador.');
    this.catalogRequestForm.reset({ customer: '', note: '' });
    this.catalogRequestTarget.set(null);
  }

  back(): void {
    if (this.done()) {
      this.done.set(false);
      this.bookedWithLiveApi.set(false);
      this.step.set(3);
      return;
    }
    this.dateStepError.set(null);
    this.step.update((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  }

  updateDate(value: string): void {
    this.selectedDate.set(value);
    this.selectedSlot.set('');
    this.dateStepError.set(null);
  }

  pickDateFromChip(value: string): void {
    this.updateDate(value);
  }

  setPeriod(period: PublicBookingPeriod): void {
    this.selectedPeriod.set(period);
    this.selectedSlot.set('');
  }

  anotherReservation(): void {
    this.done.set(false);
    this.bookedWithLiveApi.set(false);
    this.lastBookingId.set(null);
    this.step.set(1);
    this.selectedService.set('');
    this.selectedDate.set('');
    this.selectedSlot.set('');
    this.selectedEmployeeId.set('');
    this.selectedPeriod.set('manana');
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
