import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { MockSessionService } from '../services/mock-session.service';

function toLogin(router: Router, redirect: string): UrlTree {
  return router.createUrlTree(['/auth/iniciar-sesion'], {
    queryParams: { redirect },
  });
}

export const superAdminGuard: CanActivateFn = () => {
  const session = inject(MockSessionService);
  const router = inject(Router);
  if (session.role() === 'SUPER_ADMIN') {
    return true;
  }
  return toLogin(router, '/super');
};

export const tenantGuard: CanActivateFn = () => {
  const session = inject(MockSessionService);
  const router = inject(Router);
  if (session.isTenantUser()) {
    return true;
  }
  return toLogin(router, '/app');
};
