import { Component, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApiSiteConfig,
  ApiSiteConfigService,
  DEFAULT_API_SITE_CONFIG,
} from '../../../../core/services/api-site-config.service';
import { MockSessionService } from '../../../../core/services/mock-session.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-super-site-config',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './super-site-config.page.html',
  styleUrl: './super-site-config.page.scss',
})
export class SuperSiteConfigPageComponent {
  private readonly sectionOrder = ['regional', 'hero', 'sections', 'closing'] as const;

  /** Flechas del teclado cambian de sección (fuera de campos de texto). */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.loadOk() || this.loading() || this.sessionBlocked()) {
      return;
    }
    const el = event.target as HTMLElement | null;
    if (
      el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable)
    ) {
      return;
    }
    const i = this.sectionOrder.indexOf(this.activeSection());
    if (i < 0) {
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const n = Math.min(this.sectionOrder.length - 1, i + 1);
      this.setSection(this.sectionOrder[n]!);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const n = Math.max(0, i - 1);
      this.setSection(this.sectionOrder[n]!);
    }
  }

  /** Vista previa local de importes (COP u otra moneda). */
  formatAmount(n: number): string {
    const v = Number(n);
    if (Number.isNaN(v)) {
      return '—';
    }
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(v);
  }

  setSection(id: 'regional' | 'hero' | 'sections' | 'closing'): void {
    this.activeSection.set(id);
  }

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiSiteConfigService);
  readonly session = inject(MockSessionService);

  readonly loading = signal(true);
  readonly sessionBlocked = signal(false);
  readonly loadOk = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly okMsg = signal('');

  /** Pestañas del formulario (solo UI). */
  readonly activeSection = signal<'regional' | 'hero' | 'sections' | 'closing'>('regional');

  readonly form = this.fb.nonNullable.group({
    currencyCode: ['COP', [Validators.required, Validators.maxLength(12)]],
    currencySymbol: ['$', [Validators.required, Validators.maxLength(8)]],
    planPriceBasic: [79_000, [Validators.required, Validators.min(0)]],
    planPricePro: [199_000, [Validators.required, Validators.min(0)]],
    planPriceBusiness: [399_000, [Validators.required, Validators.min(0)]],
    landing: this.fb.nonNullable.group({
      navBrand: ['', [Validators.required, Validators.maxLength(120)]],
      eyebrow: ['', [Validators.required, Validators.maxLength(200)]],
      heroTitle: ['', [Validators.required, Validators.maxLength(500)]],
      heroLead: ['', [Validators.required, Validators.maxLength(2000)]],
      sectionTitle: ['', [Validators.required, Validators.maxLength(500)]],
      sectionSub: ['', [Validators.required, Validators.maxLength(1000)]],
      demoTitle: ['', [Validators.required, Validators.maxLength(500)]],
      demoSub: ['', [Validators.required, Validators.maxLength(2000)]],
      plansSectionTitle: ['', [Validators.required, Validators.maxLength(500)]],
      plansSectionSub: ['', [Validators.required, Validators.maxLength(1000)]],
      ctaTitle: ['', [Validators.required, Validators.maxLength(500)]],
      ctaLead: ['', [Validators.required, Validators.maxLength(2000)]],
      footerNote: ['', [Validators.required, Validators.maxLength(500)]],
      demoBannerText: ['', [Validators.maxLength(2000)]],
    }),
  });

  constructor() {
    if (!environment.useLiveAuth || !this.session.accessToken() || !this.session.isSuperAdmin()) {
      this.loading.set(false);
      this.sessionBlocked.set(true);
      this.error.set('Inicia sesión como super admin con API en vivo.');
      return;
    }
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.okMsg.set('');
    this.loadOk.set(false);
    this.api.getAdmin().subscribe({
      next: (c) => {
        this.patchForm(c);
        this.loadOk.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadOk.set(false);
        this.error.set('No se pudo cargar la configuración del sitio.');
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      currencyCode: raw.currencyCode.trim(),
      currencySymbol: raw.currencySymbol.trim(),
      planPriceBasic: Number(raw.planPriceBasic),
      planPricePro: Number(raw.planPricePro),
      planPriceBusiness: Number(raw.planPriceBusiness),
      landing: {
        ...raw.landing,
        demoBannerText: raw.landing.demoBannerText.trim(),
      },
    };
    this.saving.set(true);
    this.error.set('');
    this.okMsg.set('');
    this.api.patch(body).subscribe({
      next: (c) => {
        this.patchForm(c);
        this.saving.set(false);
        this.okMsg.set('Configuración guardada. La landing pública la verán en la próxima carga.');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar.');
      },
    });
  }

  private patchForm(c: ApiSiteConfig): void {
    const d = { ...DEFAULT_API_SITE_CONFIG, ...c, landing: { ...DEFAULT_API_SITE_CONFIG.landing, ...c.landing } };
    this.form.patchValue({
      currencyCode: d.currencyCode,
      currencySymbol: d.currencySymbol,
      planPriceBasic: d.planPriceBasic,
      planPricePro: d.planPricePro,
      planPriceBusiness: d.planPriceBusiness,
      landing: d.landing,
    });
  }
}
