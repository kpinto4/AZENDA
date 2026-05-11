import { HttpErrorResponse } from '@angular/common/http';
import { NgStyle } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiAppointmentsService,
  PublicLookupAppointmentDto,
} from '../../core/services/api-appointments.service';
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

/** Antelación mínima para que el cliente cambie el horario desde «Mis citas» (1,5 h antes del inicio). */
const LOOKUP_RESCHEDULE_MIN_LEAD_MS = 90 * 60 * 1000;

function parseLookupWhenToDate(when: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  const hh = m[2].padStart(2, '0');
  const d = new Date(`${m[1]}T${hh}:${m[3]}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function canClientRescheduleLookupAppointment(when: string): boolean {
  const d = parseLookupWhenToDate(when);
  if (!d) {
    return false;
  }
  return d.getTime() - Date.now() >= LOOKUP_RESCHEDULE_MIN_LEAD_MS;
}

function splitLookupYmdHhmm(when: string): { date: string; slot: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  return { date: m[1], slot: `${m[2].padStart(2, '0')}:${m[3]}` };
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

  readonly citaRefFromQuery = toSignal(
    this.route.queryParamMap.pipe(map((m) => m.get('citaRef')?.trim() ?? '')),
    { initialValue: this.route.snapshot.queryParamMap.get('citaRef')?.trim() ?? '' },
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
          publicAddress: b.publicAddress ?? null,
          publicMapsUrl: b.publicMapsUrl ?? null,
          cancellationPolicy: b.cancellationPolicy ?? null,
          reminderNotice: b.reminderNotice ?? null,
          whatsappPhoneE164: b.whatsappPhoneE164 ?? null,
          whatsappDefaultMessage: b.whatsappDefaultMessage ?? null,
          publicBookingHoursJson: b.publicBookingHoursJson ?? null,
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

  /**
   * Tras reservar: enlace wa.me al negocio si tiene WhatsApp en branding.
   * Incluye en el texto lo que haya disponible (fecha y/o referencia).
   */
  readonly businessWhatsAfterBookingHref = computed(() => {
    if (!this.done()) {
      return null;
    }
    const b = this.branding();
    const digits = (b.whatsappPhoneE164 ?? '').replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    const baseMsg =
      (b.whatsappDefaultMessage ?? '').trim() || 'Hola, escribo desde la web de reservas.';
    const when = this.lastBookingWhen()?.trim();
    const ref = this.lastBookingId()?.trim();
    const lines = [baseMsg];
    if (when) {
      lines.push(`Cita: ${when}`);
    }
    if (ref) {
      lines.push(`Ref: ${ref}`);
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n\n'))}`;
  });

  /** Enlace WhatsApp genérico al negocio (p. ej. pestaña Mis citas), sin depender de una reserva recién creada. */
  readonly businessPublicWhatsHref = computed(() => {
    const b = this.branding();
    const digits = (b.whatsappPhoneE164 ?? '').replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    const baseMsg =
      (b.whatsappDefaultMessage ?? '').trim() || 'Hola, escribo desde la página de reservas del negocio.';
    return `https://wa.me/${digits}?text=${encodeURIComponent(baseMsg)}`;
  });

  readonly catalogLayout = computed(() => this.branding().catalogLayout ?? 'horizontal');
  readonly styleVars = computed(() =>
    this.data.brandingCssVars(this.branding(), this.session.darkMode()),
  );

  /** Información legal/operativa antes de confirmar (negocio + textos por defecto claros). */
  readonly bookingClientTexts = computed(() => {
    const b = this.branding();
    const cancelDefault =
      'Para cancelar o reprogramar, contacta directamente al negocio (indica tu referencia cuando la tengas). Las condiciones pueden variar según el establecimiento.';
    const reminderDefault =
      'Tras confirmar verás una referencia: consérvala. Si compartes móvil y marcas WhatsApp, el negocio podrá enviarte recordatorios desde su propia app de WhatsApp (sin coste Meta en Azenda). El negocio también puede contactarte por teléfono.';
    return {
      address: b.publicAddress?.trim() || null,
      mapsUrl: b.publicMapsUrl?.trim() || null,
      cancellation: (b.cancellationPolicy?.trim() || cancelDefault).trim(),
      reminder: (b.reminderNotice?.trim() || reminderDefault).trim(),
    };
  });

  readonly slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '15:00', '15:30', '16:00', '16:30', '18:30', '19:00', '19:30'];

  /** Huecos para reprogramar la cita elegida en «Mis citas» (API o lista demo). */
  readonly lookupRescheduleSlotOptions = computed(() => {
    const sel = this.attendanceSelectedAppointment();
    const emp = sel?.employeeId?.trim();
    if (environment.useLiveAuth) {
      const data = this.lookupRescheduleAvailability();
      if (!data) {
        return [] as string[];
      }
      if (emp && data.slotsByEmployee[emp]?.length) {
        return data.slotsByEmployee[emp];
      }
      return data.allSlots ?? [];
    }
    return this.slots;
  });

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
  readonly lastBookingWhen = signal<string | null>(null);
  /** Si la reserva dejó móvil para contacto / recordatorio manual desde el negocio. */
  readonly lastBookingWaReminder = signal(false);
  /** Tras «Corregir día y hora»: vuelve al paso 2 y guarda con reprogramar (misma referencia). */
  readonly rescheduleMode = signal(false);
  /** Mensaje breve en pantalla de éxito tras reprogramar. */
  readonly lastBookingRescheduleNote = signal<string | null>(null);
  readonly refCopied = signal(false);
  private refCopiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly attendanceMsg = signal<string | null>(null);
  readonly attendanceErr = signal<string | null>(null);
  readonly attendanceSubmitting = signal(false);
  readonly lookupResults = signal<PublicLookupAppointmentDto[] | null>(null);
  readonly lookupSearching = signal(false);
  /** Cita elegida en resultados (o único resultado): aquí se muestra el bloque para confirmar / actualizar. */
  readonly attendanceSelectedAppointment = signal<PublicLookupAppointmentDto | null>(null);
  /** Reprogramación desde «Mis citas»: nueva fecha y franja (misma cita / referencia). */
  readonly lookupRescheduleDate = signal('');
  readonly lookupRescheduleSlot = signal('');
  readonly lookupRescheduleAvailability = signal<PublicAvailabilityDto | null>(null);
  readonly lookupRescheduleAvailLoading = signal(false);

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
    /** Móvil para que el negocio te contacte o envíe recordatorio desde su WhatsApp. */
    phone: [''],
    /** Comparto mi móvil para recordatorio/contacto por WhatsApp (desde el negocio, no automático de Azenda). */
    waReminderConsent: [false],
  });

  readonly attendanceForm = this.fb.nonNullable.group({
    appointmentId: [''],
    /** Móvil usado al reservar (con consentimiento) para buscar citas pendientes. */
    lookupPhone: [''],
    /** Para validar cambio de horario (debe coincidir con la reserva); no se usa en el buscador. */
    customer: [''],
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
    effect(() => {
      const ref = this.citaRefFromQuery();
      if (!ref || this.clientTab() !== 'asistencia') {
        return;
      }
      this.attendanceForm.patchValue({ appointmentId: ref });
    });
    effect(() => {
      const slug = this.slug();
      const date = this.lookupRescheduleDate().trim();
      const asist = this.clientTab() === 'asistencia';
      const sel = this.attendanceSelectedAppointment();
      if (!environment.useLiveAuth || !date || !asist || !sel) {
        untracked(() => {
          this.lookupRescheduleAvailability.set(null);
          this.lookupRescheduleAvailLoading.set(false);
        });
        return;
      }
      untracked(() => {
        this.lookupRescheduleAvailLoading.set(true);
        this.apiPublic.getAvailability(slug, date).subscribe({
          next: (r) => {
            this.lookupRescheduleAvailability.set(r);
            this.lookupRescheduleAvailLoading.set(false);
          },
          error: () => {
            this.lookupRescheduleAvailability.set(null);
            this.lookupRescheduleAvailLoading.set(false);
          },
        });
      });
    });
  }

  goTab(tab: 'reserva' | 'asistencia' | 'catalogo'): void {
    const slug = this.slug();
    if (tab !== 'reserva') {
      if (this.rescheduleMode()) {
        this.rescheduleMode.set(false);
        if (this.lastBookingId()) {
          this.done.set(true);
        }
      }
    }
    if (tab !== 'asistencia') {
      this.lookupResults.set(null);
      this.lookupSearching.set(false);
      this.attendanceSelectedAppointment.set(null);
      this.lookupRescheduleDate.set('');
      this.lookupRescheduleSlot.set('');
      this.lookupRescheduleAvailability.set(null);
      this.lookupRescheduleAvailLoading.set(false);
    }
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
    const name = v.name.trim();
    const phone = v.phone.trim();
    const waConsent = !!v.waReminderConsent;
    if (!name) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    if (waConsent && !phone) {
      this.bookingError.set('Para el contacto por WhatsApp indica tu número de móvil.');
      return;
    }
    const when = `${this.selectedDate()} ${this.selectedSlot()}`;
    this.bookingError.set(null);
    if (environment.useLiveAuth) {
      this.bookingSubmitting.set(true);
      this.apiAppointments
        .createPublic(this.slug(), {
          customer: name,
          service: this.selectedService(),
          when,
          employeeId: this.selectedEmployeeId() === 'any' ? undefined : this.selectedEmployeeId(),
          customerPhone: phone || undefined,
          whatsappReminderConsent: waConsent,
        })
        .subscribe({
          next: (row) => {
            this.bookingSubmitting.set(false);
            this.bookedWithLiveApi.set(true);
            this.lastBookingId.set(row.id);
            this.lastBookingWhen.set(row.when);
            this.lastBookingWaReminder.set(Boolean(row.waReminderConsent));
            this.applyEmployeeIdFromBookedService(row.service);
            this.lastBookingRescheduleNote.set(null);
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
    this.lastBookingWaReminder.set(waConsent && !!phone);
    this.lastBookingWhen.set(when);
    const wasCreated = this.data.recordBooking(
      name,
      `${this.selectedService()} · Empleado: ${this.selectedEmployeeLabel()}`,
      when,
      this.slug(),
      waConsent && phone ? phone : null,
    );
    if (!wasCreated) {
      this.bookingError.set('Ese horario ya está ocupado. Elige otra hora.');
      return;
    }
    const list = this.data.appointmentsForBookingSlug(this.slug());
    const createdRow = list[0];
    this.lastBookingId.set(createdRow?.id ?? null);
    if (createdRow?.service) {
      this.applyEmployeeIdFromBookedService(createdRow.service);
    }
    this.lastBookingRescheduleNote.set(null);
    this.done.set(true);
  }

  lookupRescheduleDateInput(iso: string): void {
    this.lookupRescheduleSlot.set('');
    this.lookupRescheduleDate.set(iso);
  }

  pickLookupRescheduleSlot(t: string): void {
    this.lookupRescheduleSlot.set(t);
  }

  /** Si la cita actual permite cambiar horario en web (≥ 90 min antes del inicio). */
  canLookupRescheduleSelected(): boolean {
    const sel = this.attendanceSelectedAppointment();
    return !!sel && canClientRescheduleLookupAppointment(sel.when);
  }

  submitLookupReschedule(): void {
    this.attendanceMsg.set(null);
    this.attendanceErr.set(null);
    const v = this.attendanceForm.getRawValue();
    const name = v.customer.trim();
    if (!name) {
      this.attendanceForm.get('customer')?.markAsTouched();
      this.attendanceErr.set('Indica tu nombre tal como en la reserva para guardar el nuevo horario.');
      return;
    }
    const ref = v.appointmentId.trim();
    const selected = this.attendanceSelectedAppointment();
    if (!selected || selected.id !== ref) {
      this.attendanceErr.set(
        !selected
          ? 'Primero elige una cita en los resultados (o busca de nuevo: si solo hay una, se selecciona sola).'
          : 'La referencia no coincide con la cita elegida. Pulsa otra vez «Elegir esta cita» en el listado.',
      );
      return;
    }
    if (!canClientRescheduleLookupAppointment(selected.when)) {
      this.attendanceErr.set(
        'Ya no puedes cambiar el horario aquí: hace menos de 90 minutos del inicio de la cita. Contacta al negocio.',
      );
      return;
    }
    const date = this.lookupRescheduleDate().trim();
    const slot = this.lookupRescheduleSlot().trim();
    if (!date) {
      this.attendanceErr.set('Elige una fecha.');
      return;
    }
    if (!slot) {
      this.attendanceErr.set('Elige una hora disponible.');
      return;
    }
    const options = this.lookupRescheduleSlotOptions();
    if (!options.includes(slot)) {
      this.attendanceErr.set('Esa hora no está disponible para el profesional de tu cita. Elige otra.');
      return;
    }
    const when = `${date} ${slot}`;
    const emp = selected.employeeId?.trim();
    if (environment.useLiveAuth) {
      this.attendanceSubmitting.set(true);
      this.apiAppointments
        .reschedulePublic(this.slug(), {
          appointmentId: ref,
          customer: name,
          when,
          ...(emp ? { employeeId: emp } : {}),
        })
        .subscribe({
          next: (row) => {
            this.attendanceSubmitting.set(false);
            this.attendanceMsg.set('Listo: el negocio verá el nuevo horario en su agenda.');
            this.patchLookupRowAfterReschedule(row.id, row.when);
            this.attendanceForm.patchValue({ appointmentId: row.id, customer: name });
          },
          error: (err: unknown) => {
            this.attendanceSubmitting.set(false);
            this.attendanceErr.set(this.formatHttpError(err));
          },
        });
      return;
    }
    const ok = this.data.reschedulePublicBookingMock(this.slug(), ref, name, when);
    if (ok) {
      this.attendanceMsg.set('Listo (demo): horario actualizado en esta sesión.');
      this.patchLookupRowAfterReschedule(ref, when);
    } else {
      this.attendanceErr.set(
        'No se pudo aplicar el cambio: hueco ocupado, nombre incorrecto o faltan 90 minutos para el inicio de la cita.',
      );
    }
  }

  private patchLookupRowAfterReschedule(id: string, newWhen: string): void {
    this.lookupResults.update((list) =>
      list ? list.map((r) => (r.id === id ? { ...r, when: newWhen } : r)) : null,
    );
    const sel = this.attendanceSelectedAppointment();
    if (sel?.id === id) {
      this.attendanceSelectedAppointment.set({ ...sel, when: newWhen });
      const parts = splitLookupYmdHhmm(newWhen);
      if (parts) {
        this.lookupRescheduleDate.set(parts.date);
        this.lookupRescheduleSlot.set(parts.slot);
      }
    }
  }

  searchActiveAppointments(): void {
    this.attendanceMsg.set(null);
    this.attendanceErr.set(null);
    this.attendanceSelectedAppointment.set(null);
    this.lookupRescheduleDate.set('');
    this.lookupRescheduleSlot.set('');
    this.lookupRescheduleAvailability.set(null);
    this.lookupRescheduleAvailLoading.set(false);
    const v = this.attendanceForm.getRawValue();
    const ref = v.appointmentId.trim();
    const phone = v.lookupPhone.trim();
    if (!ref && !phone) {
      this.attendanceErr.set('Escribe la referencia o el número de teléfono y pulsa Buscar.');
      return;
    }
    if (environment.useLiveAuth) {
      this.lookupSearching.set(true);
      this.apiAppointments
        .lookupPublicActiveAppointments(this.slug(), {
          ...(ref ? { appointmentId: ref } : {}),
          ...(phone ? { customerPhone: phone } : {}),
        })
        .subscribe({
          next: (res) => {
            this.lookupSearching.set(false);
            this.lookupResults.set(res.appointments);
            if (res.appointments.length) {
              this.attendanceErr.set(null);
              if (res.appointments.length === 1) {
                this.selectAppointmentForConfirm(res.appointments[0]);
              } else {
                this.attendanceSelectedAppointment.set(null);
              }
            } else {
              this.attendanceSelectedAppointment.set(null);
              this.attendanceErr.set(
                'No encontramos citas pendientes con esa referencia o ese teléfono.',
              );
            }
          },
          error: (err: unknown) => {
            this.lookupSearching.set(false);
            this.lookupResults.set(null);
            this.attendanceErr.set(this.formatHttpError(err));
          },
        });
      return;
    }
    const rows = this.data.lookupPublicAppointmentsMock(this.slug(), undefined, ref || undefined, phone || undefined);
    this.lookupResults.set(rows);
    if (rows.length) {
      this.attendanceErr.set(null);
      if (rows.length === 1) {
        this.selectAppointmentForConfirm(rows[0]);
      } else {
        this.attendanceSelectedAppointment.set(null);
      }
    } else {
      this.attendanceSelectedAppointment.set(null);
      this.attendanceErr.set('No encontramos citas pendientes con esa referencia o ese teléfono.');
    }
  }

  /** Elige la cita a actualizar; se muestra el apartado inferior con el resumen (no envía al servidor aún). */
  selectAppointmentForConfirm(row: PublicLookupAppointmentDto): void {
    this.attendanceErr.set(null);
    this.attendanceSelectedAppointment.set(row);
    this.attendanceForm.patchValue({ appointmentId: row.id, customer: row.customer ?? '' });
    const parts = splitLookupYmdHhmm(row.when);
    if (parts) {
      this.lookupRescheduleDate.set(parts.date);
      this.lookupRescheduleSlot.set(parts.slot);
    } else {
      this.lookupRescheduleDate.set('');
      this.lookupRescheduleSlot.set('');
    }
    this.lookupRescheduleAvailability.set(null);
    this.lookupRescheduleAvailLoading.set(false);
    if (typeof document !== 'undefined') {
      queueMicrotask(() => {
        document.getElementById('att-confirm-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  clearAttendanceSelection(): void {
    this.attendanceSelectedAppointment.set(null);
    this.attendanceForm.patchValue({ appointmentId: '', customer: '' });
    this.lookupRescheduleDate.set('');
    this.lookupRescheduleSlot.set('');
    this.lookupRescheduleAvailability.set(null);
    this.lookupRescheduleAvailLoading.set(false);
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
    if (this.rescheduleMode()) {
      this.rescheduleMode.set(false);
      this.done.set(true);
      this.dateStepError.set(null);
      this.bookingError.set(null);
      return;
    }
    if (this.done()) {
      this.done.set(false);
      this.bookedWithLiveApi.set(false);
      this.step.set(3);
      return;
    }
    this.dateStepError.set(null);
    this.step.update((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  }

  /** Tras reservar: permite cambiar solo fecha/hora (y profesional) sin nueva referencia. */
  startRescheduleAfterBooking(): void {
    if (!this.lastBookingId()?.trim()) {
      return;
    }
    this.lastBookingRescheduleNote.set(null);
    this.bookingError.set(null);
    this.dateStepError.set(null);
    this.rescheduleMode.set(true);
    this.done.set(false);
    this.step.set(2);
  }

  submitRescheduleFromStep2(): void {
    if (this.publicBookingBlockedMessage()) {
      this.alerts.warning(this.publicBookingBlockedMessage()!, 'Acceso restringido');
      return;
    }
    if (!this.rescheduleMode()) {
      return;
    }
    const id = this.lastBookingId()?.trim();
    if (!id) {
      this.bookingError.set('No hay una cita reciente para actualizar.');
      return;
    }
    const v = this.confirmForm.getRawValue();
    const name = v.name.trim();
    if (!name) {
      this.bookingError.set('Indica tu nombre tal como en la reserva para guardar el cambio de horario.');
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
    const when = `${this.selectedDate()} ${this.selectedSlot()}`;
    const emp = this.selectedEmployeeId() === 'any' ? undefined : this.selectedEmployeeId();
    if (environment.useLiveAuth) {
      this.bookingSubmitting.set(true);
      this.apiAppointments
        .reschedulePublic(this.slug(), {
          appointmentId: id,
          customer: name,
          when,
          ...(emp ? { employeeId: emp } : {}),
        })
        .subscribe({
          next: (row) => {
            this.bookingSubmitting.set(false);
            this.lastBookingWhen.set(row.when);
            this.applyEmployeeIdFromBookedService(row.service);
            this.rescheduleMode.set(false);
            this.lastBookingRescheduleNote.set(
              'Día y hora actualizados. Conserva la misma referencia para tus gestiones.',
            );
            this.done.set(true);
          },
          error: (err: unknown) => {
            this.bookingSubmitting.set(false);
            this.bookingError.set(this.formatHttpError(err));
          },
        });
      return;
    }
    const serviceStr = `${this.selectedService()} · Empleado: ${this.selectedEmployeeLabel()}`;
    const ok = this.data.reschedulePublicBookingMock(this.slug(), id, name, when, serviceStr);
    if (!ok) {
      this.bookingError.set(
        'Ese horario ya está ocupado o no pudimos aplicar el cambio. Prueba otro hueco.',
      );
      return;
    }
    this.lastBookingWhen.set(when);
    this.rescheduleMode.set(false);
    this.lastBookingRescheduleNote.set(
      'Día y hora actualizados. Conserva la misma referencia para tus gestiones.',
    );
    this.done.set(true);
  }

  private applyEmployeeIdFromBookedService(service: string): void {
    const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(service);
    const empId = m?.[1];
    if (empId && empId !== 'any') {
      this.selectedEmployeeId.set(empId);
    }
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

  copyBookingReference(ref: string): void {
    if (this.refCopiedTimer != null) {
      clearTimeout(this.refCopiedTimer);
      this.refCopiedTimer = null;
    }
    const text = ref.trim();
    if (!text) {
      return;
    }
    const done = () => {
      this.refCopied.set(true);
      this.refCopiedTimer = setTimeout(() => {
        this.refCopied.set(false);
        this.refCopiedTimer = null;
      }, 2500);
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(done).catch(() => {
        this.fallbackCopyBookingReference(text, done);
      });
      return;
    }
    this.fallbackCopyBookingReference(text, done);
  }

  private fallbackCopyBookingReference(text: string, onOk: () => void): void {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onOk();
    } catch {
      this.alerts.warning('Selecciona y copia la referencia manualmente.', 'No se pudo copiar');
    }
  }

  anotherReservation(): void {
    if (this.refCopiedTimer != null) {
      clearTimeout(this.refCopiedTimer);
      this.refCopiedTimer = null;
    }
    this.refCopied.set(false);
    this.done.set(false);
    this.bookedWithLiveApi.set(false);
    this.lastBookingWaReminder.set(false);
    this.lastBookingId.set(null);
    this.lastBookingWhen.set(null);
    this.rescheduleMode.set(false);
    this.lastBookingRescheduleNote.set(null);
    this.step.set(1);
    this.selectedService.set('');
    this.selectedDate.set('');
    this.selectedSlot.set('');
    this.selectedEmployeeId.set('');
    this.selectedPeriod.set('manana');
    this.confirmForm.reset({ name: '', phone: '', waReminderConsent: false });
    this.bookingError.set(null);
    this.dateStepError.set(null);
    this.lookupResults.set(null);
    this.lookupSearching.set(false);
    this.attendanceSelectedAppointment.set(null);
    this.attendanceForm.reset({ appointmentId: '', lookupPhone: '', customer: '' });
    this.lookupRescheduleDate.set('');
    this.lookupRescheduleSlot.set('');
    this.lookupRescheduleAvailability.set(null);
    this.lookupRescheduleAvailLoading.set(false);
  }

  private formatHttpError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Ha ocurrido un error.';
    }
    if (err.status === 0) {
      return 'No hay conexión con el servidor. Comprueba tu red y vuelve a intentarlo.';
    }
    if (err.status === 401) {
      return 'No tienes permiso para esta acción. Si persistes, actualiza la página.';
    }
    if (err.status === 403) {
      const body403 = err.error;
      if (body403 && typeof body403 === 'object' && 'message' in body403) {
        const m403 = (body403 as { message: unknown }).message;
        if (typeof m403 === 'string' && m403.trim()) {
          return this.humanizeApiMessage(m403);
        }
      }
      return 'No tienes permiso para esta acción. Si persistes, actualiza la página.';
    }
    if (err.status === 404) {
      return 'No encontramos lo solicitado. Actualiza la página o comprueba el enlace público.';
    }
    if (err.status === 409) {
      return 'Ese horario ya no está disponible. Elige otra fecha u hora.';
    }
    if (err.status === 429) {
      return 'Demasiados intentos. Espera un momento y prueba de nuevo.';
    }
    if (err.status === 502 || err.status === 503 || err.status === 504) {
      return 'El servidor de reservas no responde (suele ser el API apagado o el proxy). En local: deja corriendo el proyecto «api» en el puerto 3000 junto con «ng serve».';
    }
    if (err.status >= 500) {
      return 'El servicio tiene una incidencia temporal. Inténtalo de nuevo en unos minutos.';
    }

    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) {
        return this.humanizeApiMessage(m);
      }
      if (Array.isArray(m) && m.length) {
        return m.map(String).join('; ');
      }
    }
    if (err.status === 400) {
      return 'Los datos enviados no son válidos. Revisa nombre, teléfono y el horario elegido.';
    }
    if (err.message) {
      return err.message;
    }
    return 'Ha ocurrido un error.';
  }

  /** Refina mensajes técnicos del API en textos claros para el cliente. */
  private humanizeApiMessage(raw: string): string {
    const t = raw.trim();
    const lower = t.toLowerCase();
    if (lower.includes('occupied') || lower.includes('overlap')) {
      return 'Ese horario está ocupado. Elige otro.';
    }
    if (lower.includes('not available') || lower.includes('unavailable')) {
      return 'Ese horario ya no está disponible. Elige otro.';
    }
    return t;
  }

}
