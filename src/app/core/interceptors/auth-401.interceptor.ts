import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MockSessionService } from '../services/mock-session.service';

function isPublicAuthRequest(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/demo-session')
  );
}

export const auth401Interceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(MockSessionService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        session.accessToken() &&
        !isPublicAuthRequest(req.url)
      ) {
        session.logout();
        void router.navigate(['/auth/iniciar-sesion'], {
          queryParams: { expired: '1' },
        });
      }
      return throwError(() => err);
    }),
  );
};
