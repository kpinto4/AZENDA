import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Copia del contrato `PlatformSiteConfig` del API (landing + moneda). */
export interface ApiSiteLandingCopy {
  navBrand: string;
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  sectionTitle: string;
  sectionSub: string;
  demoTitle: string;
  demoSub: string;
  plansSectionTitle: string;
  plansSectionSub: string;
  ctaTitle: string;
  ctaLead: string;
  footerNote: string;
  demoBannerText: string;
}

export interface ApiSiteConfig {
  currencyCode: string;
  currencySymbol: string;
  planPriceBasic: number;
  planPricePro: number;
  planPriceBusiness: number;
  landing: ApiSiteLandingCopy;
}

export const DEFAULT_API_SITE_CONFIG: ApiSiteConfig = {
  currencyCode: 'COP',
  currencySymbol: '$',
  planPriceBasic: 79_000,
  planPricePro: 199_000,
  planPriceBusiness: 399_000,
  landing: {
    navBrand: 'Azenda',
    eyebrow: 'SaaS multi-tenant modular',
    heroTitle: 'Citas, ventas e inventario en un solo panel',
    heroLead:
      'Azenda combina agenda inteligente, POS ligero y stock para negocios que viven de las reservas. Activa solo los módulos que necesitas.',
    sectionTitle: 'Todo lo esencial, sin ruido',
    sectionSub: 'Diseñado para barberías, spas, clínicas ligeras y talleres con cita previa.',
    demoTitle: 'Reservas públicas + WhatsApp',
    demoSub:
      'Tus clientes eligen servicio, fecha y hora en una página limpia. Integración WhatsApp por niveles (enlace, plantilla, futuro chatbot).',
    plansSectionTitle: 'Planes claros',
    plansSectionSub: 'Los límites reales (empleados, citas/mes, módulos) los aplicará el backend.',
    ctaTitle: 'Listo para operar tu negocio real',
    ctaLead: 'Registro, tenant y módulos serán persistidos cuando conectemos el backend.',
    footerNote: '© 2026 Azenda · Demo front-end',
    demoBannerText: '',
  },
};

export function mergeApiSiteConfig(fromApi: ApiSiteConfig): ApiSiteConfig {
  return {
    ...DEFAULT_API_SITE_CONFIG,
    ...fromApi,
    landing: { ...DEFAULT_API_SITE_CONFIG.landing, ...fromApi.landing },
  };
}

@Injectable({ providedIn: 'root' })
export class ApiSiteConfigService {
  private readonly http = inject(HttpClient);

  getPublic(): Observable<ApiSiteConfig> {
    return this.http.get<ApiSiteConfig>(`${environment.apiBaseUrl}/public/site-config`);
  }

  getAdmin(): Observable<ApiSiteConfig> {
    return this.http.get<ApiSiteConfig>(`${environment.apiBaseUrl}/admin/site-config`);
  }

  patch(body: Record<string, unknown>): Observable<ApiSiteConfig> {
    return this.http.patch<ApiSiteConfig>(`${environment.apiBaseUrl}/admin/site-config`, body);
  }
}
