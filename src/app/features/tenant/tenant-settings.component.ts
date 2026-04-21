import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

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
  private readonly doc = inject(DOCUMENT);

  readonly servicesForm = this.fb.nonNullable.group({
    servicesText: [''],
  });
  readonly servicesMsg = signal('');

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
    openTime: '09:00',
    closeTime: '20:00',
    waPhone: '+34 600 000 000',
    waMessage: 'Hola, quiero reservar...',
    brandColor: '#4f46e5',
  });

  constructor() {
    effect(() => {
      const slug = this.session.publicBookingSlug();
      if (!slug) {
        return;
      }
      const lines = this.data.servicesForBookingSlug(slug).join('\n');
      untracked(() =>
        this.servicesForm.patchValue({ servicesText: lines }, { emitEvent: false }),
      );
    });
  }

  saveServicesCatalog(): void {
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    const raw = this.servicesForm.controls.servicesText.getRawValue();
    const list = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) {
      this.servicesMsg.set('Escribe al menos un servicio (una línea cada uno).');
      return;
    }
    this.data.setServicesForBookingSlug(slug, list);
    this.servicesMsg.set('Servicios guardados para este negocio (demo en memoria).');
  }

  dark = false;

  toggleDark(): void {
    this.dark = !this.dark;
    this.session.toggleDarkTheme(this.doc.documentElement, this.dark);
  }

  whatsappHref(): string {
    const phone = this.form.controls.waPhone.getRawValue().replace(/\D/g, '');
    const text = encodeURIComponent(this.form.controls.waMessage.getRawValue());
    return `https://wa.me/${phone}?text=${text}`;
  }
}
