import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, map, of, retry, timer } from 'rxjs';
import {
  ApiSiteConfigService,
  createLandingSiteConfigState,
  LandingSiteConfigState,
} from '../../core/services/api-site-config.service';

const RESOLVER_RETRY_COUNT = 2;
const RESOLVER_RETRY_DELAY_MS = 900;

/** Carga la config pública antes de mostrar la landing. Sin API, no hay precios (evita montos de fallback). */
export const landingSiteConfigResolver: ResolveFn<LandingSiteConfigState> = () => {
  const api = inject(ApiSiteConfigService);
  return api.getPublic().pipe(
    retry({
      count: RESOLVER_RETRY_COUNT,
      delay: () => timer(RESOLVER_RETRY_DELAY_MS),
    }),
    map((c) => createLandingSiteConfigState(c, true)),
    catchError(() => of(createLandingSiteConfigState(null, false))),
  );
};
