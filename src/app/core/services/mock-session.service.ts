import { Injectable, computed, inject, signal } from '@angular/core';
import { MockDataService, MockTenant } from './mock-data.service';

export type DemoRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE' | null;

export interface TenantModulesState {
  appointments: boolean;
  sales: boolean;
  inventory: boolean;
}

@Injectable({ providedIn: 'root' })
export class MockSessionService {
  private readonly data = inject(MockDataService);

  readonly role = signal<DemoRole>(null);
  readonly userName = signal('');
  readonly tenantName = signal('');
  readonly tenantId = signal<string | null>(null);
  readonly modules = signal<TenantModulesState>({
    appointments: true,
    sales: true,
    inventory: true,
  });

  readonly isSuperAdmin = computed(() => this.role() === 'SUPER_ADMIN');
  readonly isTenantUser = computed(() => {
    const r = this.role();
    return r === 'TENANT_ADMIN' || r === 'EMPLOYEE';
  });

  loginAsSuperAdmin(): void {
    this.role.set('SUPER_ADMIN');
    this.userName.set('Super Admin');
    this.tenantName.set('');
    this.tenantId.set(null);
  }

  /** Entra como admin del tenant Barbería Centro (t1). */
  loginAsTenantAdmin(): void {
    const t = this.data.tenantById('t1');
    if (t) {
      this.loginFromTenant(t, { userName: 'María López', role: 'TENANT_ADMIN' });
    }
  }

  /** Entra como empleado del tenant t1. */
  loginAsEmployee(): void {
    const t = this.data.tenantById('t1');
    if (t) {
      this.loginFromTenant(t, { userName: 'Carlos Ruiz', role: 'EMPLOYEE' });
    }
  }

  loginFromTenant(t: MockTenant, opts: { userName: string; role: 'TENANT_ADMIN' | 'EMPLOYEE' }): void {
    this.role.set(opts.role === 'EMPLOYEE' ? 'EMPLOYEE' : 'TENANT_ADMIN');
    this.userName.set(opts.userName);
    this.tenantId.set(t.id);
    this.tenantName.set(t.name);
    this.applyModulesFromTenant(t);
  }

  /** Sincroniza nombre y módulos visibles cuando el super admin edita el tenant (demo en memoria). */
  syncFromTenant(t: MockTenant): void {
    if (this.tenantId() !== t.id) {
      return;
    }
    this.tenantName.set(t.name);
    this.applyModulesFromTenant(t);
  }

  private applyModulesFromTenant(t: MockTenant): void {
    this.modules.set({
      appointments: t.modules.includes('citas'),
      sales: t.modules.includes('ventas'),
      inventory: t.modules.includes('inventario'),
    });
  }

  logout(): void {
    this.role.set(null);
    this.userName.set('');
    this.tenantName.set('');
    this.tenantId.set(null);
  }

  toggleDarkTheme(root: HTMLElement, enabled: boolean): void {
    if (enabled) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}
