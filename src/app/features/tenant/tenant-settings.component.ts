import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAuthService, ApiTenantBillingStatusResponse } from '../../core/services/api-auth.service';
import { ApiTenantCatalogService } from '../../core/services/api-tenant-catalog.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

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
  readonly opsMsg = signal('');
  readonly billingMsg = signal('');
  readonly billingStatus = signal<ApiTenantBillingStatusResponse | null>(null);
  readonly brandingImageHint = signal<string | null>(null);
  readonly logoPreview = signal<string | null>(null);
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
      tienda: `${base}?tab=tienda`,
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

  readonly form = this.fb.nonNullable.group({
    tenantName: [''],
    displayName: [''],
    openTime: '09:00',
    closeTime: '20:00',
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
    manualBookingEnabled: true,
  });

  constructor() {
    effect(() => {
      const canManage = this.canManageOperations();
      const ctrl = this.form.controls.manualBookingEnabled;
      if (canManage) {
        ctrl.enable({ emitEvent: false });
      } else {
        ctrl.disable({ emitEvent: false });
      }
    });
    effect(() => {
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
            manualBookingEnabled: tenant?.manualBookingEnabled ?? true,
          },
          { emitEvent: false },
        );
        this.logoPreview.set(branding.logoUrl ?? null);
      });
    });
    effect(() => {
      if (!environment.useLiveAuth || !this.session.accessToken() || !this.session.isTenantUser()) {
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
      this.brandingImageHint.set('Logo demasiado grande (máx. ~800 KB en demo).');
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
    };
    this.data.updateTenantName(tenantId, v.tenantName);
    this.data.updateTenantBranding(tenantId, brandingPatch);
    const tenant = this.data.tenantById(tenantId);
    if (tenant) {
      this.session.syncFromTenant(tenant);
    }
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.patchBranding(brandingPatch).subscribe({
        next: () => {
          this.brandingMsg.set(
            'Identidad y estilo guardados en API. Aplica al panel y al enlace de reservas.',
          );
        },
        error: () => {
          this.brandingMsg.set(
            'Se guardó solo localmente. No se pudo persistir branding en API.',
          );
        },
      });
      return;
    }
    this.brandingMsg.set('Identidad y estilo guardados. Aplica al panel y al enlace de reservas.');
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
      progressLabel: `${billing.progressPct.toFixed(0)}% del ciclo consumido`,
      daysLabel: `${billing.daysRemaining} dia(s) restantes de ${billing.daysTotal}`,
      startedLabel: new Date(this.billingStatus()!.subscriptionStartedAt).toLocaleDateString(),
      periodStartLabel: new Date(billing.currentPeriodStart).toLocaleDateString(),
      periodEndLabel: new Date(billing.currentPeriodEnd).toLocaleDateString(),
      renewalLabel: new Date(billing.nextRenewalAt).toLocaleDateString(),
    };
  });

  saveOperationalSettings(): void {
    const tenantId = this.session.tenantId();
    if (!tenantId || !this.canManageOperations()) {
      this.opsMsg.set('Solo admin del negocio puede cambiar esta opción.');
      return;
    }
    const enabled = !!this.form.controls.manualBookingEnabled.getRawValue();
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiAuth.patchTenantSettings({ manualBookingEnabled: enabled }).subscribe({
        next: (ctx) => {
          const row = ctx.tenant;
          if (row) {
            this.data.syncTenantsFromApi([
              {
                id: row.id,
                name: row.name,
                slug: row.slug,
                status: row.status as 'ACTIVE' | 'PAUSED' | 'BLOCKED',
                plan: row.plan,
                storefrontEnabled: row.storefrontEnabled,
                manualBookingEnabled: row.manualBookingEnabled,
                modules: row.modules,
              },
            ]);
            const t = this.data.tenantById(tenantId);
            if (t) {
              this.session.syncFromTenant(t);
            }
          }
          this.opsMsg.set('Preferencias operativas guardadas en el API.');
        },
        error: () => {
          this.opsMsg.set('No se pudo guardar en API. Verifica permisos y conexión.');
        },
      });
      return;
    }
    this.data.setTenantManualBookingEnabled(tenantId, enabled);
    const t = this.data.tenantById(tenantId);
    if (t) {
      this.session.syncFromTenant(t);
    }
    this.opsMsg.set('Preferencias operativas guardadas (modo demo).');
  }

  whatsappHref(): string {
    const phone = this.form.controls.waPhone.getRawValue().replace(/\D/g, '');
    const text = encodeURIComponent(this.form.controls.waMessage.getRawValue());
    return `https://wa.me/${phone}?text=${text}`;
  }
}
