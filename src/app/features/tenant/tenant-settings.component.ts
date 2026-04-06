import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-tenant-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-settings.component.html',
  styleUrl: './tenant-settings.component.scss',
})
export class TenantSettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly session = inject(MockSessionService);
  private readonly doc = inject(DOCUMENT);

  readonly form = this.fb.nonNullable.group({
    openTime: '09:00',
    closeTime: '20:00',
    waPhone: '+34 600 000 000',
    waMessage: 'Hola, quiero reservar...',
    brandColor: '#4f46e5',
  });

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
