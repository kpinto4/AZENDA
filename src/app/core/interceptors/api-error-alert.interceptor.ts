import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MockSessionService } from '../services/mock-session.service';
import { UiAlertService } from '../services/ui-alert.service';

function extractMessage(err: HttpErrorResponse): string {
  const body = err.error as unknown;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object') {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  return '';
}

export const apiErrorAlertInterceptor: HttpInterceptorFn = (req, next) => {
  const alerts = inject(UiAlertService);
  const session = inject(MockSessionService);

  return next(req).pipe(
    catchError((rawErr: unknown) => {
      if (!(rawErr instanceof HttpErrorResponse)) {
        return throwError(() => rawErr);
      }

      if (rawErr.status === 403) {
        const backendMessage = extractMessage(rawErr);
        const restriction = session.tenantRestrictionMessage();
        const message =
          restriction ||
          backendMessage ||
          'No tienes permisos para ejecutar esta accion. Verifica tu plan o contacta soporte.';
        alerts.warning(message, 'Acceso restringido');
      }

      return throwError(() => rawErr);
    }),
  );
};

