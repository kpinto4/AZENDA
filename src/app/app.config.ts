import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { apiErrorAlertInterceptor } from './core/interceptors/api-error-alert.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { MockSessionService } from './core/services/mock-session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorAlertInterceptor])),
    provideAppInitializer(() => {
      const session = inject(MockSessionService);
      return firstValueFrom(session.restoreSessionFromStorage());
    }),
  ],
};
