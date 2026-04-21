import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MockSessionService } from '../services/mock-session.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(MockSessionService);
  const token = session.accessToken();
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
