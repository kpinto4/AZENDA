import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApiTenantsAdminService,
  ApiTenantAdminDto,
} from '../../core/services/api-tenants-admin.service';
import {
  MockDataService,
  TenantModuleKey,
  deriveBookingSlug,
} from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-super-tenants',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './super-tenants.component.html',
  styleUrl: './super-tenants.component.scss',
})
export class SuperTenantsComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiTenantsAdmin = inject(ApiTenantsAdminService);

  readonly apiRows = signal<ApiTenantAdminDto[]>([]);
  readonly apiError = signal<string>('');

  readonly useApiTenants = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isSuperAdmin(),
  );

  readonly moduleKeys: TenantModuleKey[] = ['citas', 'ventas', 'inventario'];
  readonly plans = ['Trial', 'Básico', 'Pro', 'Negocio'];

  /** Módulos iniciales según plan (luego se pueden cambiar con el checklist). */
  defaultModulesForPlan(plan: string): {
    citas: boolean;
    ventas: boolean;
    inventario: boolean;
  } {
    switch (plan) {
      case 'Trial':
        return { citas: true, ventas: false, inventario: false };
      case 'Básico':
        return { citas: true, ventas: true, inventario: false };
      case 'Pro':
      case 'Negocio':
        return { citas: true, ventas: true, inventario: true };
      default:
        return { citas: true, ventas: true, inventario: false };
    }
  }

  readonly addForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    plan: ['Trial', Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.useApiTenants()) {
        untracked(() => this.reloadApiTenants());
      }
    });
  }

  addTenant(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue();
    if (this.useApiTenants()) {
      const id = `tenant_${Date.now()}`;
      const slug = deriveBookingSlug(v.name.trim(), id);
      const mods = this.defaultModulesForPlan(v.plan);
      this.apiError.set('');
      this.apiTenantsAdmin
        .create({
          id,
          name: v.name.trim(),
          slug,
          status: 'ACTIVE',
          plan: v.plan,
          billingCycle: 'MONTHLY',
          citas: mods.citas,
          ventas: mods.ventas,
          inventario: mods.inventario,
        })
        .subscribe({
          next: () => {
            this.addForm.reset({ name: '', plan: 'Trial' });
            this.reloadApiTenants();
          },
          error: () =>
            this.apiError.set(
              'No se pudo crear el tenant (slug duplicado o error de API).',
            ),
        });
      return;
    }
    this.data.addTenant(v.name, v.plan);
    this.addForm.reset({ name: '', plan: 'Trial' });
  }

  setApiTenantActive(t: ApiTenantAdminDto, active: boolean): void {
    this.apiError.set('');
    this.apiTenantsAdmin
      .patch(t.id, { status: active ? 'ACTIVE' : 'PAUSED' })
      .subscribe({
        next: () => this.reloadApiTenants(),
        error: () => this.apiError.set('Error al actualizar estado.'),
      });
  }

  formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString();
  }

  daysRemaining(t: ApiTenantAdminDto): number {
    const end = new Date(t.currentPeriodEnd).getTime();
    if (Number.isNaN(end)) {
      return 0;
    }
    const ms = end - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  setApiTenantStorefront(t: ApiTenantAdminDto, enabled: boolean): void {
    this.apiError.set('');
    this.apiTenantsAdmin.patch(t.id, { storefrontEnabled: enabled }).subscribe({
      next: () => this.reloadApiTenants(),
      error: () => this.apiError.set('Error al actualizar la tienda publica.'),
    });
  }

  setApiTenantModule(
    t: ApiTenantAdminDto,
    key: TenantModuleKey,
    enabled: boolean,
  ): void {
    const patch =
      key === 'citas'
        ? { citas: enabled }
        : key === 'ventas'
          ? { ventas: enabled }
          : { inventario: enabled };
    this.apiTenantsAdmin.patch(t.id, patch).subscribe({
      next: () => this.reloadApiTenants(),
      error: () => this.apiError.set('Error al actualizar módulos.'),
    });
  }

  deleteApiTenant(row: ApiTenantAdminDto): void {
    if (!confirm(`Eliminar tenant "${row.name}" (${row.id})?`)) {
      return;
    }
    this.apiTenantsAdmin.delete(row.id).subscribe({
      next: () => this.reloadApiTenants(),
      error: () => this.apiError.set('Error al eliminar.'),
    });
  }

  private reloadApiTenants(): void {
    if (!environment.useLiveAuth || !this.session.accessToken() || !this.session.isSuperAdmin()) {
      return;
    }
    this.apiTenantsAdmin.list().subscribe({
      next: (rows) => {
        this.apiRows.set(rows);
        this.data.syncTenantsFromApi(rows);
      },
      error: () => this.apiError.set('No se pudo cargar la lista desde el API.'),
    });
  }
}
