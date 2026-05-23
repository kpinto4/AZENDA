import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
  ApiSiteConfig,
  ApiSiteConfigService,
  DEFAULT_API_SITE_CONFIG,
  mergeApiSiteConfig,
} from '../../core/services/api-site-config.service';

/** Carga la config pública antes de mostrar la landing (evita parpadeo de precios). */
export const landingSiteConfigResolver: ResolveFn<ApiSiteConfig> = () => {
  const api = inject(ApiSiteConfigService);
  return api.getPublic().pipe(
    map((c) => mergeApiSiteConfig(c)),
    catchError(() => of(mergeApiSiteConfig(DEFAULT_API_SITE_CONFIG))),
  );
};
