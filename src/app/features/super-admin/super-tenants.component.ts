import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { SuperTenantBillingPanelComponent } from './components/super-tenant-billing-panel.component';

export type TenantStatusFilter = 'all' | 'active' | 'paused' | 'pending';

@Component({
  selector: 'app-super-tenants',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, SuperTenantBillingPanelComponent],
  templateUrl: './super-tenants.component.html',
  styleUrl: './super-tenants.component.scss',
})
export class SuperTenantsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiTenantsAdmin = inject(ApiTenantsAdminService);

  readonly apiRows = signal<ApiTenantAdminDto[]>([]);
  readonly apiError = signal<string>('');
  readonly activatingTenantId = signal<string | null>(null);
  readonly deletingTenantId = signal<string | null>(null);
  /** Segundo clic para confirmar borrado (evita `window.confirm`, a veces bloqueado). */
  readonly deleteConfirmId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<TenantStatusFilter>('all');
  readonly showAddForm = signal(false);
  readonly expandedBillingId = signal<string | null>(null);

  readonly pendingActivationRows = computed(() =>
    this.apiRows().filter((t) => t.subscriptionStatus === 'pending_payment'),
  );

  readonly activeTenantCount = computed(
    () => this.apiRows().filter((t) => t.status === 'ACTIVE').length,
  );

  readonly filteredApiRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();
    return this.apiRows().filter((t) => {
      if (filter === 'active' && t.status !== 'ACTIVE') {
        return false;
      }
      if (filter === 'paused' && t.status !== 'PAUSED') {
        return false;
      }
      if (filter === 'pending' && t.subscriptionStatus !== 'pending_payment') {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [t.name, t.slug, t.id, t.plan, t.adminEmail ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly useApiTenants = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isSuperAdmin(),
  );

  readonly moduleKeys: TenantModuleKey[] = ['citas', 'ventas', 'inventario'];
  readonly plans = ['Trial', 'Básico', 'Pro', 'Negocio'];

  readonly statusFilters: { id: TenantStatusFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'paused', label: 'Pausados' },
    { id: 'pending', label: 'Pago pendiente' },
  ];

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

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('facturacion');
      if (id) {
        this.expandedBillingId.set(id);
      }
    });
  }

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

  setStatusFilter(filter: TenantStatusFilter): void {
    this.statusFilter.set(filter);
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  tenantInitial(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }

  moduleEnabled(t: ApiTenantAdminDto, key: TenantModuleKey): boolean {
    return key === 'citas'
      ? t.modules.citas
      : key === 'ventas'
        ? t.modules.ventas
        : t.modules.inventario;
  }

  billingExpanded(tenantId: string): boolean {
    return this.expandedBillingId() === tenantId;
  }

  toggleBillingDrawer(tenantId: string, event: Event): void {
    const details = event.target as HTMLDetailsElement;
    this.expandedBillingId.set(details.open ? tenantId : null);
  }

  onBillingSaved(updated: ApiTenantAdminDto): void {
    this.apiRows.update((rows) =>
      rows.map((r) => (r.id === updated.id ? updated : r)),
    );
    this.data.syncTenantsFromApi([updated]);
  }

  cycleLabel(c: 'MONTHLY' | 'YEARLY'): string {
    return c === 'YEARLY' ? 'Anual' : 'Mensual';
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
            this.showAddForm.set(false);
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
    this.showAddForm.set(false);
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

  requestDeleteTenant(row: ApiTenantAdminDto): void {
    if (this.deletingTenantId()) {
      return;
    }
    this.apiError.set('');
    this.deleteConfirmId.set(row.id);
  }

  cancelDeleteTenant(): void {
    this.deleteConfirmId.set(null);
  }

  deleteApiTenant(row: ApiTenantAdminDto): void {
    if (this.deletingTenantId()) {
      return;
    }
    this.apiError.set('');
    this.deleteConfirmId.set(null);
    this.deletingTenantId.set(row.id);
    this.apiTenantsAdmin.delete(row.id).subscribe({
      next: () => {
        this.deletingTenantId.set(null);
        if (this.expandedBillingId() === row.id) {
          this.expandedBillingId.set(null);
        }
        this.apiRows.update((rows) => rows.filter((r) => r.id !== row.id));
        this.reloadApiTenants();
      },
      error: (err: unknown) => {
        this.deletingTenantId.set(null);
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 0;
        let detail = '';
        if (err && typeof err === 'object' && 'error' in err) {
          const body = (err as { error?: unknown }).error;
          if (typeof body === 'string' && body.trim()) {
            detail = body.trim();
          } else if (body && typeof body === 'object' && 'message' in body) {
            const msg = (body as { message?: unknown }).message;
            detail = Array.isArray(msg)
              ? msg.join(', ')
              : typeof msg === 'string'
                ? msg
                : '';
          }
        }
        this.apiError.set(
          detail ||
            (status
              ? `No se pudo eliminar el negocio (HTTP ${status}).`
              : 'No se pudo eliminar el negocio. Revisa la consola de red.'),
        );
      },
    });
  }

  isPendingActivation(t: ApiTenantAdminDto): boolean {
    return t.subscriptionStatus === 'pending_payment';
  }

  confirmPaymentAndActivate(t: ApiTenantAdminDto): void {
    if (this.activatingTenantId()) {
      return;
    }
    const emailHint = t.adminEmail ? ` (${t.adminEmail})` : '';
    if (
      !confirm(
        `¿Confirmar pago y activar "${t.name}"${emailHint}? El negocio podrá entrar al panel con los módulos marcados.`,
      )
    ) {
      return;
    }
    this.apiError.set('');
    this.activatingTenantId.set(t.id);
    this.apiTenantsAdmin.activateSubscription(t.id).subscribe({
      next: () => {
        this.activatingTenantId.set(null);
        this.reloadApiTenants();
      },
      error: () => {
        this.activatingTenantId.set(null);
        this.apiError.set('No se pudo activar la suscripción.');
      },
    });
  }

  private reloadApiTenants(): void {
    if (
      !environment.useLiveAuth ||
      !this.session.accessToken() ||
      !this.session.isSuperAdmin()
    ) {
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
