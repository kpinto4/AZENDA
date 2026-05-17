import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { superAdminGuard, tenantAdminGuard, tenantGuard } from './auth.guards';
import { MockSessionService } from '../services/mock-session.service';

describe('auth.guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  describe('superAdminGuard', () => {
    it('permite acceso a SUPER_ADMIN', () => {
      TestBed.inject(MockSessionService).loginAsSuperAdmin();
      const out = TestBed.runInInjectionContext(() => superAdminGuard({} as never, {} as never));
      expect(out).toBe(true);
    });

    it('redirige a login con redirect /super si no hay rol', () => {
      TestBed.inject(MockSessionService).logout();
      const router = TestBed.inject(Router);
      const out = TestBed.runInInjectionContext(() => superAdminGuard({} as never, {} as never));
      expect(out).not.toBe(true);
      expect(router.serializeUrl(out as never)).toContain('/auth/iniciar-sesion');
      expect(router.serializeUrl(out as never)).toContain('redirect=%2Fsuper');
    });
  });

  describe('tenantGuard', () => {
    it('permite TENANT_ADMIN', () => {
      TestBed.inject(MockSessionService).loginAsTenantAdmin();
      const out = TestBed.runInInjectionContext(() => tenantGuard({} as never, {} as never));
      expect(out).toBe(true);
    });

    it('redirige a login con redirect /app si no es usuario tenant', () => {
      TestBed.inject(MockSessionService).logout();
      const router = TestBed.inject(Router);
      const out = TestBed.runInInjectionContext(() => tenantGuard({} as never, {} as never));
      const url = router.serializeUrl(out as never);
      expect(url).toContain('/auth/iniciar-sesion');
      expect(url).toContain('redirect=%2Fapp');
    });
  });

  describe('tenantAdminGuard', () => {
    it('permite TENANT_ADMIN', () => {
      TestBed.inject(MockSessionService).loginAsTenantAdmin();
      expect(TestBed.runInInjectionContext(() => tenantAdminGuard({} as never, {} as never))).toBe(true);
    });

    it('redirige a /app/panel si es EMPLOYEE', () => {
      TestBed.inject(MockSessionService).loginAsEmployee();
      const router = TestBed.inject(Router);
      const out = TestBed.runInInjectionContext(() => tenantAdminGuard({} as never, {} as never));
      expect(router.serializeUrl(out as never)).toBe('/app/panel');
    });
  });
});
