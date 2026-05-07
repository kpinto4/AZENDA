import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  map,
  of,
  switchMap,
  throwError,
  tap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiAuthService, ApiAuthUser, ApiLoginResponse } from './api-auth.service';
import { MockDataService, MockTenant } from './mock-data.service';
import { isJwtExpired } from '../utils/jwt.util';

export type DemoRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE' | null;

export interface TenantModulesState {
  appointments: boolean;
  sales: boolean;
  inventory: boolean;
}

export type TenantLifecycleStatus = 'ACTIVE' | 'PAUSED' | 'BLOCKED';

const AUTH_STORAGE_KEY = 'azenda.auth.v1';

@Injectable({ providedIn: 'root' })
export class MockSessionService {
  private readonly data = inject(MockDataService);
  private readonly apiAuth = inject(ApiAuthService);

  /** JWT del backend; si existe, las peticiones HTTP llevan Authorization. */
  readonly accessToken = signal<string | null>(null);

  /** Slug de reserva pública del negocio actual: `/reservar/:slug` */
  readonly publicBookingSlug = signal<string>('');

  /** Id del tenant en el API (SQLite), cuando la sesión viene del backend. */
  readonly apiTenantId = signal<string | null>(null);

  readonly role = signal<DemoRole>(null);
  readonly currentUserId = signal<string | null>(null);
  readonly userName = signal('');
  readonly tenantName = signal('');
  readonly tenantId = signal<string | null>(null);
  readonly modules = signal<TenantModulesState>({
    appointments: true,
    sales: true,
    inventory: true,
  });

  /** Plan comercial del tenant (API o mock). */
  readonly tenantPlan = signal<string>('Trial');

  /** Tienda pública tipo catálogo (planes Pro+). */
  readonly tenantStorefront = signal(false);
  /** Si está activo, se permite crear citas manualmente desde panel tenant. */
  readonly manualBookingEnabled = signal(true);
  /** Estado operativo del tenant para avisos/restricciones en UI. */
  readonly tenantStatus = signal<TenantLifecycleStatus | null>(null);
  readonly darkMode = signal(false);

  readonly isSuperAdmin = computed(() => this.role() === 'SUPER_ADMIN');
  readonly isTenantUser = computed(() => {
    const r = this.role();
    return r === 'TENANT_ADMIN' || r === 'EMPLOYEE';
  });
  readonly isTenantRestricted = computed(() => {
    const status = this.tenantStatus();
    return status === 'PAUSED' || status === 'BLOCKED';
  });
  readonly tenantRestrictionMessage = computed(() => {
    const status = this.tenantStatus();
    if (status === 'PAUSED') {
      return 'Tu plan esta pausado. Las funciones operativas estan deshabilitadas temporalmente.';
    }
    if (status === 'BLOCKED') {
      return 'Tu negocio esta bloqueado. Contacta a soporte para recuperar el acceso.';
    }
    return null;
  });

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkTokenExpiryAndLogout();
        }
      });
    }
  }

  loginAsSuperAdmin(): void {
    this.currentUserId.set('mock_super_admin');
    this.role.set('SUPER_ADMIN');
    this.userName.set('Super Admin');
    this.tenantName.set('');
    this.tenantId.set(null);
    this.publicBookingSlug.set('');
    this.apiTenantId.set(null);
    this.modules.set({ appointments: false, sales: false, inventory: false });
    this.tenantPlan.set('Trial');
    this.tenantStorefront.set(false);
    this.manualBookingEnabled.set(true);
    this.tenantStatus.set(null);
    this.darkMode.set(false);
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
    this.publicBookingSlug.set(t.bookingSlug);
    this.apiTenantId.set(t.apiTenantId ?? null);
    this.manualBookingEnabled.set(t.manualBookingEnabled ?? true);
    this.applyModulesFromTenant(t);
  }

  /**
   * Aplica login real del API: guarda JWT, mapea rol y (en tenant) alinea menús con `/tenant/context`.
   * El `tenantId` de sesión sigue siendo el del mock (`t1`…) para que el resto de la UI demo siga funcionando.
   */
  applyLiveLoginResponse(res: ApiLoginResponse): Observable<void> {
    return this.hydrateWithTokenAndUser(res.accessToken, res.user);
  }

  /** Restaura sesión desde `localStorage` si el JWT sigue vigente. */
  restoreSessionFromStorage(): Observable<void> {
    if (typeof localStorage === 'undefined') {
      return of(undefined);
    }
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return of(undefined);
    }
    let parsed: { accessToken?: string };
    try {
      parsed = JSON.parse(raw) as { accessToken?: string };
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return of(undefined);
    }
    const token = parsed.accessToken;
    if (!token || isJwtExpired(token)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return of(undefined);
    }
    this.accessToken.set(token);
    return this.apiAuth.me().pipe(
      switchMap((user) => this.hydrateWithTokenAndUser(token, user)),
      catchError(() => {
        this.clearStoredAuth();
        this.logoutLocalState();
        return of(undefined);
      }),
    );
  }

  /** Guarda JWT para sobrevivir recargas. La caducidad la marca el propio JWT (`exp`). */
  persistAuthIfRequested(accessToken: string, rememberMe: boolean): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (!rememberMe) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken }));
  }

  private clearStoredAuth(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  private logoutLocalState(): void {
    this.accessToken.set(null);
    this.currentUserId.set(null);
    this.role.set(null);
    this.userName.set('');
    this.tenantName.set('');
    this.tenantId.set(null);
    this.publicBookingSlug.set('');
    this.apiTenantId.set(null);
    this.modules.set({ appointments: false, sales: false, inventory: false });
    this.tenantPlan.set('Trial');
    this.tenantStorefront.set(false);
    this.manualBookingEnabled.set(true);
    this.tenantStatus.set(null);
  }

  /** Actualiza menús del tenant desde el API (módulos, plan, tienda pública). */
  refreshTenantModulesFromApi(): Observable<void> {
    if (!environment.useLiveAuth || !this.accessToken() || !this.isTenantUser()) {
      return of(undefined);
    }
    return this.apiAuth.tenantContext().pipe(
      tap((ctx) => {
        if (!ctx.tenant) {
          return;
        }
        this.modules.set({
          appointments: ctx.tenant.modules.citas,
          sales: ctx.tenant.modules.ventas,
          inventory: ctx.tenant.modules.inventario,
        });
        this.tenantPlan.set(ctx.tenant.plan ?? 'Trial');
        this.tenantStorefront.set(!!ctx.tenant.storefrontEnabled);
        this.manualBookingEnabled.set(!!ctx.tenant.manualBookingEnabled);
        this.tenantStatus.set(ctx.tenant.status as TenantLifecycleStatus);
        this.tenantName.set(ctx.tenant.name);
        this.publicBookingSlug.set(ctx.tenant.slug);
        this.apiTenantId.set(ctx.tenant.id);
        this.data.syncTenantsFromApi([
          {
            id: ctx.tenant.id,
            name: ctx.tenant.name,
            slug: ctx.tenant.slug,
            status: ctx.tenant.status as 'ACTIVE' | 'PAUSED' | 'BLOCKED',
            plan: ctx.tenant.plan,
            storefrontEnabled: ctx.tenant.storefrontEnabled,
            manualBookingEnabled: ctx.tenant.manualBookingEnabled,
            modules: ctx.tenant.modules,
          },
        ]);
      }),
      map(() => undefined),
    );
  }

  private checkTokenExpiryAndLogout(): void {
    const t = this.accessToken();
    if (!t) {
      return;
    }
    if (isJwtExpired(t)) {
      this.clearStoredAuth();
      this.logoutLocalState();
    }
  }

  private hydrateWithTokenAndUser(
    token: string,
    u: ApiAuthUser,
  ): Observable<void> {
    this.accessToken.set(token);
    this.currentUserId.set(u.id);
    this.apiTenantId.set(u.tenantId);

    if (u.role === 'SUPER_ADMIN') {
      this.loginAsSuperAdmin();
      return of(undefined);
    }

    if (u.role === 'ADMIN' || u.role === 'EMPLEADO') {
      if (!u.tenantId) {
        this.logout();
        return throwError(() => new Error('Usuario sin tenant asignado'));
      }

      const role = u.role === 'EMPLEADO' ? 'EMPLOYEE' : 'TENANT_ADMIN';

      // Primero `/tenant/context`: crea o actualiza el mapeo API→mock (`syncTenantsFromApi`).
      // Antes se exigía el mapeo antes de esta llamada y el login fallaba para tenants nuevos solo en API.
      return this.apiAuth.tenantContext().pipe(
        switchMap((ctx) => {
          if (!ctx.tenant) {
            this.logout();
            return throwError(
              () => new Error('No se pudo obtener el contexto del tenant'),
            );
          }

          const apiRow = {
            id: ctx.tenant.id,
            name: ctx.tenant.name,
            slug: ctx.tenant.slug,
            status: ctx.tenant.status as 'ACTIVE' | 'PAUSED' | 'BLOCKED',
            plan: ctx.tenant.plan ?? 'Trial',
            storefrontEnabled: !!ctx.tenant.storefrontEnabled,
            manualBookingEnabled: !!ctx.tenant.manualBookingEnabled,
            modules: ctx.tenant.modules,
          };
          this.data.syncTenantsFromApi([apiRow]);

          const mockTenantId = this.data.getMockTenantIdForApi(ctx.tenant.id);
          if (!mockTenantId) {
            this.logout();
            return throwError(
              () => new Error('No se pudo mapear el tenant al estado local'),
            );
          }
          const tenant = this.data.tenantById(mockTenantId);
          if (!tenant) {
            this.logout();
            return throwError(() => new Error('Tenant demo no encontrado'));
          }

          this.loginFromTenant(tenant, { userName: u.email, role });
          // Mantener el id real del usuario autenticado (no mock), para filtros por empleado.
          this.currentUserId.set(u.id);

          this.tenantName.set(ctx.tenant.name);
          this.publicBookingSlug.set(ctx.tenant.slug);
          this.apiTenantId.set(ctx.tenant.id);
          this.modules.set({
            appointments: ctx.tenant.modules.citas,
            sales: ctx.tenant.modules.ventas,
            inventory: ctx.tenant.modules.inventario,
          });
          this.tenantPlan.set(ctx.tenant.plan ?? 'Trial');
          this.tenantStorefront.set(!!ctx.tenant.storefrontEnabled);
          this.manualBookingEnabled.set(!!ctx.tenant.manualBookingEnabled);
          this.tenantStatus.set(ctx.tenant.status as TenantLifecycleStatus);

          return of(undefined);
        }),
      );
    }

    this.logout();
    return throwError(() => new Error('Rol de API no soportado en UI'));
  }

  /** Sincroniza nombre y módulos visibles cuando el super admin edita el tenant (demo en memoria). */
  syncFromTenant(t: MockTenant): void {
    if (this.accessToken()) {
      return;
    }
    if (this.tenantId() !== t.id) {
      return;
    }
    this.tenantName.set(t.name);
    this.publicBookingSlug.set(t.bookingSlug);
    this.apiTenantId.set(t.apiTenantId ?? null);
    this.applyModulesFromTenant(t);
  }

  private applyModulesFromTenant(t: MockTenant): void {
    this.modules.set({
      appointments: t.modules.includes('citas'),
      sales: t.modules.includes('ventas'),
      inventory: t.modules.includes('inventario'),
    });
    this.tenantPlan.set(t.plan);
    this.tenantStorefront.set(!!t.storefrontEnabled);
    this.manualBookingEnabled.set(t.manualBookingEnabled ?? true);
    this.tenantStatus.set(t.active ? 'ACTIVE' : 'PAUSED');
  }

  logout(): void {
    this.clearStoredAuth();
    this.logoutLocalState();
  }

  toggleDarkTheme(root: HTMLElement, enabled: boolean): void {
    this.darkMode.set(enabled);
    if (enabled) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}
