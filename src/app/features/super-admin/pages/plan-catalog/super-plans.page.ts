import { Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApiPlanCatalogEntry,
  ApiPlanCatalogService,
} from '../../../../core/services/api-plan-catalog.service';
import { MockSessionService } from '../../../../core/services/mock-session.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-super-plans',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './super-plans.page.html',
  styleUrl: './super-plans.page.scss',
})
export class SuperPlansPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiPlanCatalogService);
  readonly session = inject(MockSessionService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly okMsg = signal('');

  readonly form = this.fb.group({
    rows: this.fb.array<FormGroup>([]),
  });

  get rows(): FormArray<FormGroup> {
    return this.form.controls.rows;
  }

  constructor() {
    if (!environment.useLiveAuth || !this.session.accessToken() || !this.session.isSuperAdmin()) {
      this.loading.set(false);
      this.error.set('Inicia sesión como super admin con API en vivo.');
      return;
    }
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.okMsg.set('');
    this.api.list().subscribe({
      next: (entries) => {
        this.rows.clear();
        for (const e of entries) {
          this.rows.push(this.rowGroup(e));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el catálogo de precios.');
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const entries: ApiPlanCatalogEntry[] = this.rows.getRawValue().map((r) => ({
      planKey: String(r['planKey']),
      priceMonthly: Number(r['priceMonthly']),
      priceYearly: Number(r['priceYearly']),
    }));
    this.saving.set(true);
    this.error.set('');
    this.okMsg.set('');
    this.api.replace({ entries }).subscribe({
      next: (updated) => {
        this.rows.clear();
        for (const e of updated) {
          this.rows.push(this.rowGroup(e));
        }
        this.saving.set(false);
        this.okMsg.set('Precios globales guardados. Los tenants con cada plan se actualizan automáticamente.');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar.');
      },
    });
  }

  private rowGroup(e: ApiPlanCatalogEntry): FormGroup {
    return this.fb.nonNullable.group({
      planKey: [e.planKey],
      priceMonthly: [e.priceMonthly, [Validators.required, Validators.min(0)]],
      priceYearly: [e.priceYearly, [Validators.required, Validators.min(0)]],
    });
  }
}
