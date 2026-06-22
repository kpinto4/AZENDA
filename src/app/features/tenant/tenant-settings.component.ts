import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAuthService, ApiTenantBillingStatusResponse } from '../../core/services/api-auth.service';
import { ApiTenantCatalogService } from '../../core/services/api-tenant-catalog.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import {
  DAY_CODES,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  type WeeklyBusinessHours,
  parseWeeklyHoursJson,
  weeklyHoursToJson,
} from '../../core/public-booking-hours';
import {
  DEFAULT_POS_PAYMENT_METHODS,
  type PosPaymentMethod,
  parsePosPaymentMethodsJson,
  paymentMethodNeedsDetail,
  serializePosPaymentMethods,
} from '../../core/pos-payment-methods';

interface ColorPreset {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  useGradient: boolean;
  gradientFrom: string;
  gradientTo: string;
  gradientAngleDeg: number;
}

@Component({
  selector: 'app-tenant-settings',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tenant-settings.component.html',
  styleUrl: './tenant-settings.component.scss',
})
export class TenantSettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  private readonly doc = inject(DOCUMENT);

  readonly brandingMsg = signal('');
  readonly scheduleMsg = signal('');
  readonly billingMsg = signal('');
  readonly billingStatus = signal<ApiTenantBillingStatusResponse | null>(null);
  readonly brandingImageHint = signal<string | null>(null);
  readonly logoPreview = signal<string | null>(null);
  readonly paymentMethods = signal<PosPaymentMethod[]>(
    DEFAULT_POS_PAYMENT_METHODS.map((m) => ({ ...m })),
  );
  readonly paymentMsg = signal('');
  protected readonly paymentMethodNeedsDetail = paymentMethodNeedsDetail;
  readonly colorPresets: ColorPreset[] = [
    {
      id: 'azenda-default',
      name: 'Azenda clásico',
      primaryColor: '#4f46e5',
      accentColor: '#06b6d4',
      bgColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      useGradient: false,
      gradientFrom: '#4f46e5',
      gradientTo: '#06b6d4',
      gradientAngleDeg: 135,
    },
    {
      id: 'indigo-ocean',
      name: 'Índigo océano',
      primaryColor: '#2563eb',
      accentColor: '#38bdf8',
      bgColor: '#eef4ff',
      surfaceColor: '#e8f1ff',
      textColor: '#0f172a',
      useGradient: true,
      gradientFrom: '#1e3a8a',
      gradientTo: '#0ea5e9',
      gradientAngleDeg: 140,
    },
    {
      id: 'emerald-clean',
      name: 'Verde limpio',
      primaryColor: '#0f766e',
      accentColor: '#22c55e',
      bgColor: '#f0fdf4',
      surfaceColor: '#ffffff',
      textColor: '#052e16',
      useGradient: true,
      gradientFrom: '#064e3b',
      gradientTo: '#0f766e',
      gradientAngleDeg: 145,
    },
    {
      id: 'sunset-warm',
      name: 'Atardecer cálido',
      primaryColor: '#b45309',
      accentColor: '#f97316',
      bgColor: '#fffaf5',
      surfaceColor: '#fff3e8',
      textColor: '#3f2208',
      useGradient: true,
      gradientFrom: '#f59e0b',
      gradientTo: '#fb7185',
      gradientAngleDeg: 125,
    },
    {
      id: 'charcoal-neon',
      name: 'Carbón neón',
      primaryColor: '#22d3ee',
      accentColor: '#a3e635',
      bgColor: '#020617',
      surfaceColor: '#111827',
      textColor: '#e5e7eb',
      useGradient: true,
      gradientFrom: '#0f172a',
      gradientTo: '#164e63',
      gradientAngleDeg: 135,
    },
    {
      id: 'rose-soft',
      name: 'Rosa suave',
      primaryColor: '#db2777',
      accentColor: '#fb7185',
      bgColor: '#fff1f7',
      surfaceColor: '#fff0f6',
      textColor: '#4a0d2f',
      useGradient: true,
      gradientFrom: '#f472b6',
      gradientTo: '#fb7185',
      gradientAngleDeg: 130,
    },
    {
      id: 'lilac-bloom',
      name: 'Lila bloom',
      primaryColor: '#7c3aed',
      accentColor: '#a78bfa',
      bgColor: '#f6f0ff',
      surfaceColor: '#f2e9ff',
      textColor: '#2e1065',
      useGradient: true,
      gradientFrom: '#8b5cf6',
      gradientTo: '#c084fc',
      gradientAngleDeg: 135,
    },
  ];

  readonly publicBookingUrl = computed(() => {
    const slug = this.session.publicBookingSlug();
    const origin = this.doc.defaultView?.location?.origin ?? '';
    if (!slug || !origin) {
      return '';
    }
    return `${origin}/reservar/${slug}`;
  });

  readonly publicClientUrls = computed(() => {
    const base = this.publicBookingUrl();
    if (!base) {
      return null;
    }
    return {
      reserva: base,
      asistencia: `${base}?tab=asistencia`,
      catalogo: `${base}?tab=catalogo`,
    };
  });

  copyBookingLink(): void {
    const url = this.publicBookingUrl();
    if (!url) {
      return;
    }
    void this.doc.defaultView?.navigator.clipboard.writeText(url);
  }

  copyUrl(text: string): void {
    if (!text) {
      return;
    }
    void this.doc.defaultView?.navigator.clipboard.writeText(text);
  }

  readonly dayScheduleMeta = DAY_CODES.map((code) => ({
    code,
    label: DAY_LABELS[code],
    shortLabel: DAY_SHORT_LABELS[code],
  }));

  private dayHoursGroup(enabledDefault: boolean): FormGroup {
    return this.fb.group({
      enabled: [enabledDefault],
      aOpen: ['09:00'],
      aClose: ['20:00'],
      split: [false],
      bOpen: ['16:00'],
      bClose: ['20:00'],
    });
  }

  readonly hoursForm: FormGroup = this.fb.group({
    mon: this.dayHoursGroup(true),
    tue: this.dayHoursGroup(true),
    wed: this.dayHoursGroup(true),
    thu: this.dayHoursGroup(true),
    fri: this.dayHoursGroup(true),
    sat: this.dayHoursGroup(true),
    sun: this.dayHoursGroup(false),
  });

  readonly form = this.fb.nonNullable.group({
    tenantName: [''],
    displayName: [''],
    waPhone: '+34 600 000 000',
    waMessage: 'Hola, quiero reservar...',
    brandColor: '#4f46e5',
    accentColor: '#06b6d4',
    bgColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#0f172a',
    borderRadiusPx: 12,
    useGradient: false,
    gradientFrom: '#4f46e5',
    gradientTo: '#06b6d4',
    gradientAngleDeg: 135,
    publicAddress: '',
    publicMapsUrl: '',
    reviewsUrl: '',
    cancellationPolicy: '',
    reminderNotice: '',
  });

  readonly logoInitial = computed(() => {
    const name = this.form.controls.displayName.getRawValue().trim() || this.session.tenantName();
    return (name.charAt(0) || 'A').toUpperCase();
  });

  constructor() {
    effect((onCleanup) => {
      if (environment.useLiveAuth && this.session.accessToken() && this.session.isTenantUser()) {
        const tenantId = this.session.tenantId();
        if (!tenantId) {
          return;
        }
        const sub: Subscription = this.apiCatalog.getCatalog().subscribe({
          next: (res) => {
            const b = res.branding;
            const tenant = this.data.tenantById(tenantId);
            untracked(() => {
              this.data.applyBrandingFromApi(tenantId, b);
              this.form.patchValue(
                {
                  tenantName: tenant?.name ?? '',
                  displayName: b.displayName,
                  brandColor: b.primaryColor,
                  accentColor: b.accentColor,
                  bgColor: b.bgColor,
                  surfaceColor: b.surfaceColor,
                  textColor: b.textColor,
                  borderRadiusPx: b.borderRadiusPx,
                  useGradient: b.useGradient,
                  gradientFrom: b.gradientFrom,
                  gradientTo: b.gradientTo,
                  gradientAngleDeg: b.gradientAngleDeg,
                  publicAddress: b.publicAddress ?? '',
                  publicMapsUrl: b.publicMapsUrl ?? '',
                  reviewsUrl: b.reviewsUrl ?? '',
                  cancellationPolicy: b.cancellationPolicy ?? '',
                  reminderNotice: b.reminderNotice ?? '',
                  waPhone: this.formatWaPhoneDisplay(b.whatsappPhoneE164),
                  waMessage: b.whatsappDefaultMessage ?? 'Hola, quiero reservar...',
                },
                { emitEvent: false },
              );
              this.paymentMethods.set(parsePosPaymentMethodsJson(b.posPaymentMethodsJson));
              this.patchHoursFromBrandingJson(b.publicBookingHoursJson ?? null);
              this.logoPreview.set(b.logoUrl ?? null);
            });
          },
        });
        onCleanup(() => sub.unsubscribe());
        return;
      }

      const tenantId = this.session.tenantId();
      if (!tenantId) {
        return;
      }
      const tenant = this.data.tenantById(tenantId);
      const branding = this.data.brandingForTenant(tenantId);
      untracked(() => {
        this.form.patchValue(
          {
            tenantName: tenant?.name ?? '',
            displayName: branding.displayName,
            brandColor: branding.primaryColor,
            accentColor: branding.accentColor,
            bgColor: branding.bgColor,
            surfaceColor: branding.surfaceColor,
            textColor: branding.textColor,
            borderRadiusPx: branding.borderRadiusPx,
            useGradient: branding.useGradient,
            gradientFrom: branding.gradientFrom,
            gradientTo: branding.gradientTo,
            gradientAngleDeg: branding.gradientAngleDeg,
            publicAddress: branding.publicAddress ?? '',
            publicMapsUrl: branding.publicMapsUrl ?? '',
            reviewsUrl: branding.reviewsUrl ?? '',
            cancellationPolicy: branding.cancellationPolicy ?? '',
            reminderNotice: branding.reminderNotice ?? '',
            waPhone: this.formatWaPhoneDisplay(branding.whatsappPhoneE164),
            waMessage: branding.whatsappDefaultMessage ?? 'Hola, quiero reservar...',
          },
          { emitEvent: false },
        );
        this.paymentMethods.set(parsePosPaymentMethodsJson(branding.posPaymentMethodsJson));
        this.patchHoursFromBrandingJson(branding.publicBookingHoursJson ?? null);
        this.logoPreview.set(branding.logoUrl ?? null);
      });
    });
    effect(() => {
      if (
        !environment.useLiveAuth ||
        !this.session.accessToken() ||
        !this.session.isTenantUser() ||
        this.session.isDemoShowcase()
      ) {
        this.billingStatus.set(null);
        this.billingMsg.set('');
        return;
      }
      untracked(() => {
        this.apiAuth.tenantBillingStatus().subscribe({
          next: (res) => {
            this.billingStatus.set(res);
            this.billingMsg.set('');
          },
          error: () => {
            this.billingStatus.set(null);
            this.billingMsg.set('No se pudo cargar el estado de facturacion.');
          },
        });
      });
    });
  }

  onLogoSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    this.brandingImageHint.set(null);
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    if (file.size > 800 * 1024) {
      this.brandingImageHint.set('Logo demasiado grande (máx. ~800 KB).');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === 'string') {
        this.logoPreview.set(r);
      }
    };
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoPreview.set(null);
  }

  saveBranding(): void {
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    const v = this.form.getRawValue();
    const brandingPatch = {
      displayName: v.displayName,
      logoUrl: this.logoPreview(),
      primaryColor: v.brandColor,
      accentColor: v.accentColor,
      bgColor: v.bgColor,
      surfaceColor: v.surfaceColor,
      textColor: v.textColor,
      borderRadiusPx: Number(v.borderRadiusPx),
      useGradient: !!v.useGradient,
      gradientFrom: v.gradientFrom,
      gradientTo: v.gradientTo,
      gradientAngleDeg: Number(v.gradientAngleDeg),
      publicAddress: v.publicAddress.trim(),
      publicMapsUrl: v.publicMapsUrl.trim(),
      reviewsUrl: v.reviewsUrl.trim(),
      cancellationPolicy: v.cancellationPolicy.trim(),
      reminderNotice: v.reminderNotice.trim(),
      posPaymentMethodsJson: serializePosPaymentMethods(this.paymentMethods()),
      ...this.buildScheduleWhatsappPatch(),
    };
    this.data.updateTenantName(tenantId, v.tenantName);
    this.data.updateTenantBranding(tenantId, brandingPatch);
    const tenant = this.data.tenantById(tenantId);
    if (tenant) {
      this.session.syncFromTenant(tenant);
    }
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.patchBranding(brandingPatch).subscribe({
        next: (b) => {
          this.data.applyBrandingFromApi(tenantId, b);
          this.brandingMsg.set('Identidad y estilo guardados.');
        },
        error: () => {
          this.brandingMsg.set('No se pudo guardar. Inténtalo de nuevo.');
        },
      });
      return;
    }
    this.brandingMsg.set('Identidad y estilo guardados.');
  }

  savePaymentMethods(): void {
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    const payload = {
      posPaymentMethodsJson: serializePosPaymentMethods(this.paymentMethods()),
    };
    this.data.updateTenantBranding(tenantId, payload);
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.patchBranding(payload).subscribe({
        next: (b) => {
          this.data.applyBrandingFromApi(tenantId, b);
          this.paymentMethods.set(parsePosPaymentMethodsJson(b.posPaymentMethodsJson));
          this.paymentMsg.set('Métodos de pago actualizados.');
        },
        error: () => {
          this.paymentMsg.set('No se pudieron guardar los métodos de pago.');
        },
      });
      return;
    }
    this.paymentMsg.set('Métodos de pago actualizados.');
  }

  togglePaymentMethod(id: string, enabled: boolean): void {
    this.paymentMethods.update((list) =>
      list.map((m) => (m.id === id ? { ...m, enabled } : m)),
    );
  }

  updatePaymentMethodDetail(id: string, detail: string): void {
    this.paymentMethods.update((list) =>
      list.map((m) => (m.id === id ? { ...m, detail } : m)),
    );
  }

  resetBrandingColors(): void {
    this.form.patchValue({
      brandColor: '#4f46e5',
      accentColor: '#06b6d4',
      bgColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      borderRadiusPx: 12,
      useGradient: false,
      gradientFrom: '#4f46e5',
      gradientTo: '#06b6d4',
      gradientAngleDeg: 135,
    });
    this.saveBranding();
    this.brandingMsg.set('Colores restablecidos a los valores por defecto.');
  }

  applyColorPreset(preset: ColorPreset): void {
    this.form.patchValue({
      brandColor: preset.primaryColor,
      accentColor: preset.accentColor,
      bgColor: preset.bgColor,
      surfaceColor: preset.surfaceColor,
      textColor: preset.textColor,
      useGradient: preset.useGradient,
      gradientFrom: preset.gradientFrom,
      gradientTo: preset.gradientTo,
      gradientAngleDeg: preset.gradientAngleDeg,
    });
    this.brandingMsg.set(`Paleta aplicada: ${preset.name}. Guarda para confirmar.`);
  }

  readonly dark = computed(() => this.session.darkMode());

  toggleDark(): void {
    this.session.toggleDarkTheme(this.doc.documentElement, !this.dark());
  }

  readonly canManageOperations = computed(() => this.session.role() === 'TENANT_ADMIN');
  readonly billingSummary = computed(() => {
    const billing = this.billingStatus()?.billing;
    if (!billing) {
      return null;
    }
    return {
      cycleLabel: billing.cycle === 'YEARLY' ? 'Anual' : 'Mensual',
      progressPct: billing.progressPct,
      progressLabel: `${billing.progressPct.toFixed(0)}% del ciclo consumido`,
      daysLabel: `${billing.daysRemaining} dia(s) restantes de ${billing.daysTotal}`,
      startedLabel: new Date(this.billingStatus()!.subscriptionStartedAt).toLocaleDateString(),
      periodStartLabel: new Date(billing.currentPeriodStart).toLocaleDateString(),
      periodEndLabel: new Date(billing.currentPeriodEnd).toLocaleDateString(),
      renewalLabel: new Date(billing.nextRenewalAt).toLocaleDateString(),
    };
  });

  whatsappHref(): string {
    const phone = this.form.controls.waPhone.getRawValue().replace(/\D/g, '');
    const text = encodeURIComponent(this.form.controls.waMessage.getRawValue());
    return `https://wa.me/${phone}?text=${text}`;
  }

  saveScheduleAndWhatsapp(): void {
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    const patch = this.buildScheduleWhatsappPatch();
    this.data.updateTenantBranding(tenantId, patch);
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.patchBranding(patch).subscribe({
        next: (b) => {
          this.data.applyBrandingFromApi(tenantId, b);
          this.scheduleMsg.set('Horario de reservas y WhatsApp guardados.');
        },
        error: () => {
          this.scheduleMsg.set('No se pudo guardar horario ni WhatsApp.');
        },
      });
      return;
    }
    this.scheduleMsg.set('Horario de reservas y WhatsApp guardados.');
  }

  private buildScheduleWhatsappPatch(): {
    publicBookingHoursJson: string | null;
    whatsappPhoneE164: string | null;
    whatsappDefaultMessage: string | null;
  } {
    return {
      publicBookingHoursJson: this.serializeHoursToJson(),
      whatsappPhoneE164: this.waDigitsFromForm(),
      whatsappDefaultMessage: this.form.controls.waMessage.getRawValue().trim() || null,
    };
  }

  private waDigitsFromForm(): string | null {
    const d = this.form.controls.waPhone.getRawValue().replace(/\D/g, '');
    return d.length ? d : null;
  }

  private serializeHoursToJson(): string | null {
    const out: WeeklyBusinessHours = {};
    for (const code of DAY_CODES) {
      const g = this.hoursForm.get(code);
      if (!g?.get('enabled')?.value) {
        continue;
      }
      const aOpen = String(g.get('aOpen')?.value ?? '09:00');
      const aClose = String(g.get('aClose')?.value ?? '20:00');
      const ranges: { open: string; close: string }[] = [{ open: aOpen, close: aClose }];
      if (g.get('split')?.value) {
        ranges.push({
          open: String(g.get('bOpen')?.value ?? '16:00'),
          close: String(g.get('bClose')?.value ?? '20:00'),
        });
      }
      out[code] = ranges;
    }
    return Object.keys(out).length ? weeklyHoursToJson(out) : null;
  }

  private defaultHoursShape(): WeeklyBusinessHours {
    const r = [{ open: '09:00', close: '20:00' }];
    return { mon: r, tue: r, wed: r, thu: r, fri: r, sat: r };
  }

  private patchHoursFromBrandingJson(json: string | null | undefined): void {
    const parsed = parseWeeklyHoursJson(json);
    const effective: WeeklyBusinessHours =
      parsed && Object.keys(parsed).length ? parsed : this.defaultHoursShape();
    for (const code of DAY_CODES) {
      const g = this.hoursForm.get(code);
      if (!g) {
        continue;
      }
      const ranges = effective[code];
      if (!ranges?.length) {
        g.patchValue(
          {
            enabled: false,
            aOpen: '09:00',
            aClose: '20:00',
            split: false,
            bOpen: '16:00',
            bClose: '20:00',
          },
          { emitEvent: false },
        );
        continue;
      }
      const [a, b] = ranges;
      g.patchValue(
        {
          enabled: true,
          aOpen: a.open,
          aClose: a.close,
          split: !!b,
          bOpen: b?.open ?? '16:00',
          bClose: b?.close ?? '20:00',
        },
        { emitEvent: false },
      );
    }
  }

  private formatWaPhoneDisplay(digits: string | null | undefined): string {
    if (!digits?.trim()) {
      return '';
    }
    const d = digits.replace(/\D/g, '');
    return d ? `+${d}` : '';
  }
}
