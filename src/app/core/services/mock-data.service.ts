import { Injectable, signal } from '@angular/core';

export type TenantModuleKey = 'citas' | 'ventas' | 'inventario';

export interface MockTenant {
  id: string;
  name: string;
  plan: string;
  active: boolean;
  modules: TenantModuleKey[];
}

export interface MockAppointment {
  id: string;
  customer: string;
  service: string;
  when: string;
  status: 'confirmada' | 'pendiente' | 'cancelada';
}

export interface MockSale {
  id: string;
  date: string;
  total: number;
  method: string;
  linkedAppointment?: string;
  stockNote?: string;
}

export interface MockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStock: boolean;
}

export interface MockEmployee {
  id: string;
  name: string;
  role: string;
  services: string[];
}

export interface MockStockMovement {
  id: string;
  at: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
}

export interface MockPlatformUser {
  id: string;
  email: string;
  role: string;
  tenantLabel: string;
}

export interface MockCatalogModule {
  key: TenantModuleKey;
  name: string;
  desc: string;
  enabled: boolean;
}

const LOW_STOCK_BELOW = 5;

function initialTenants(): MockTenant[] {
  return [
    {
      id: 't1',
      name: 'Barbería Centro',
      plan: 'Pro',
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    },
    {
      id: 't2',
      name: 'Spa Relax',
      plan: 'Básico',
      active: true,
      modules: ['citas', 'ventas'],
    },
    {
      id: 't3',
      name: 'Clínica Demo',
      plan: 'Trial',
      active: false,
      modules: ['citas'],
    },
  ];
}

function initialAppointments(): MockAppointment[] {
  return [
    {
      id: 'a1',
      customer: 'Ana G.',
      service: 'Corte + barba',
      when: '2026-04-07 10:00',
      status: 'confirmada',
    },
    {
      id: 'a2',
      customer: 'Luis M.',
      service: 'Corte clásico',
      when: '2026-04-07 11:30',
      status: 'pendiente',
    },
    {
      id: 'a3',
      customer: 'Elena R.',
      service: 'Tinte',
      when: '2026-04-08 09:00',
      status: 'confirmada',
    },
  ];
}

function initialSales(): MockSale[] {
  return [
    { id: 's1', date: '2026-04-05', total: 35, method: 'Tarjeta', linkedAppointment: 'a1' },
    { id: 's2', date: '2026-04-05', total: 18, method: 'Efectivo' },
    { id: 's3', date: '2026-04-04', total: 52, method: 'Bizum' },
  ];
}

function initialProducts(): MockProduct[] {
  return [
    { id: 'p1', name: 'Champú profesional', sku: 'SKU-001', stock: 24, lowStock: false },
    { id: 'p2', name: 'Cera mate', sku: 'SKU-014', stock: 4, lowStock: true },
    { id: 'p3', name: 'Toallas desechables', sku: 'SKU-022', stock: 120, lowStock: false },
  ];
}

function initialEmployees(): MockEmployee[] {
  return [
    { id: 'e1', name: 'Carlos Ruiz', role: 'Barbero', services: ['Corte', 'Barba'] },
    { id: 'e2', name: 'Laura Sánchez', role: 'Colorista', services: ['Tinte', 'Mechas'] },
  ];
}

function initialStockMovements(): MockStockMovement[] {
  return [
    {
      id: 'm0',
      at: '2026-04-01 09:00',
      productId: 'p1',
      productName: 'Champú profesional',
      delta: 12,
      reason: 'Entrada inicial simulada',
    },
  ];
}

function initialPlatformUsers(): MockPlatformUser[] {
  return [
    { id: 'u1', email: 'super@azenda.app', role: 'SUPER_ADMIN', tenantLabel: '—' },
    { id: 'u2', email: 'admin@barberia.demo', role: 'ADMIN', tenantLabel: 'Barbería Centro' },
    { id: 'u3', email: 'emp@barberia.demo', role: 'EMPLEADO', tenantLabel: 'Barbería Centro' },
    { id: 'u4', email: 'admin@spa.demo', role: 'ADMIN', tenantLabel: 'Spa Relax' },
  ];
}

function initialCatalog(): MockCatalogModule[] {
  return [
    {
      key: 'citas',
      name: 'Citas',
      desc: 'Agenda, reservas públicas y empleados.',
      enabled: true,
    },
    {
      key: 'ventas',
      name: 'Ventas',
      desc: 'POS, métodos de pago e historial.',
      enabled: true,
    },
    {
      key: 'inventario',
      name: 'Inventario',
      desc: 'Stock, movimientos y alertas.',
      enabled: true,
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  readonly tenants = signal<MockTenant[]>(initialTenants());
  readonly appointments = signal<MockAppointment[]>(initialAppointments());
  readonly sales = signal<MockSale[]>(initialSales());
  readonly products = signal<MockProduct[]>(initialProducts());
  readonly employees = signal<MockEmployee[]>(initialEmployees());
  readonly stockMovements = signal<MockStockMovement[]>(initialStockMovements());
  readonly platformUsers = signal<MockPlatformUser[]>(initialPlatformUsers());
  readonly platformModuleCatalog = signal<MockCatalogModule[]>(initialCatalog());

  tenantById(id: string): MockTenant | undefined {
    return this.tenants().find((t) => t.id === id);
  }

  /** Vuelve todos los datos mock al estado inicial (solo memoria). */
  resetDemo(): void {
    this.tenants.set(initialTenants());
    this.appointments.set(initialAppointments());
    this.sales.set(initialSales());
    this.products.set(initialProducts());
    this.employees.set(initialEmployees());
    this.stockMovements.set(initialStockMovements());
    this.platformUsers.set(initialPlatformUsers());
    this.platformModuleCatalog.set(initialCatalog());
  }

  registerNewTenant(businessName: string): MockTenant {
    const id = `t${Date.now()}`;
    const row: MockTenant = {
      id,
      name: businessName.trim(),
      plan: 'Trial',
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    };
    this.tenants.update((list) => [...list, row]);
    return row;
  }

  addTenant(name: string, plan: string): void {
    const id = `t${Date.now()}`;
    const row: MockTenant = {
      id,
      name: name.trim(),
      plan,
      active: true,
      modules: ['citas', 'ventas', 'inventario'],
    };
    this.tenants.update((list) => [...list, row]);
  }

  setTenantActive(id: string, active: boolean): void {
    this.tenants.update((list) => list.map((t) => (t.id === id ? { ...t, active } : t)));
  }

  setTenantPlan(id: string, plan: string): void {
    this.tenants.update((list) => list.map((t) => (t.id === id ? { ...t, plan } : t)));
  }

  setTenantModule(id: string, key: TenantModuleKey, enabled: boolean): void {
    this.tenants.update((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const has = t.modules.includes(key);
        if (enabled && !has) {
          return { ...t, modules: [...t.modules, key] };
        }
        if (!enabled && has) {
          return { ...t, modules: t.modules.filter((m) => m !== key) };
        }
        return t;
      }),
    );
  }

  toggleCatalogModule(key: TenantModuleKey): void {
    this.platformModuleCatalog.update((list) =>
      list.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m)),
    );
  }

  addPlatformUser(email: string, role: string, tenantLabel: string): void {
    const id = `u${Date.now()}`;
    this.platformUsers.update((list) => [...list, { id, email: email.trim(), role, tenantLabel }]);
  }

  removePlatformUser(id: string): void {
    this.platformUsers.update((list) => list.filter((u) => u.id !== id));
  }

  addAppointment(row: Omit<MockAppointment, 'id'>): void {
    const id = `a${Date.now()}`;
    this.appointments.update((list) => [{ id, ...row }, ...list]);
  }

  setAppointmentStatus(id: string, status: MockAppointment['status']): void {
    this.appointments.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  addSale(row: Omit<MockSale, 'id' | 'stockNote'>, opts?: { productId?: string; stockQty?: number }): void {
    const id = `s${Date.now()}`;
    let stockNote: string | undefined;
    const qty = opts?.stockQty ?? 1;
    if (opts?.productId) {
      const name = this.applyProductDelta(opts.productId, -qty, 'Venta simulada');
      if (name) {
        stockNote = `Stock: −${qty} · ${name}`;
      }
    }
    this.sales.update((list) => [{ id, ...row, stockNote }, ...list]);
  }

  recordBooking(customer: string, service: string, when: string): void {
    this.addAppointment({
      customer,
      service,
      when,
      status: 'pendiente',
    });
  }

  addEmployee(name: string, role: string, servicesCsv: string): void {
    const id = `e${Date.now()}`;
    const services = servicesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.employees.update((list) => [...list, { id, name: name.trim(), role: role.trim(), services }]);
  }

  /** Movimiento manual de stock (entrada/salida simulada). */
  applyStockMovement(productId: string, delta: number, reason: string): void {
    this.applyProductDelta(productId, delta, reason);
  }

  private applyProductDelta(productId: string, delta: number, reason: string): string | null {
    let label: string | null = null;
    this.products.update((list) =>
      list.map((p) => {
        if (p.id !== productId) return p;
        label = p.name;
        const stock = Math.max(0, p.stock + delta);
        return { ...p, stock, lowStock: stock < LOW_STOCK_BELOW };
      }),
    );
    if (label) {
      const id = `m${Date.now()}`;
      const at = new Date().toISOString().slice(0, 16).replace('T', ' ');
      this.stockMovements.update((m) => [
        { id, at, productId, productName: label!, delta, reason },
        ...m,
      ]);
    }
    return label;
  }
}
