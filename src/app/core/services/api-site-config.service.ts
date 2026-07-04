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
  /** Texto plano del aviso superior opcional (legal, campañas); reservado para usos futuros en la landing. */
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

/** Estado resuelto para la landing: textos pueden usar fallback; precios solo si vienen del API. */
export interface LandingSiteConfigState {
  config: ApiSiteConfig;
  pricesFromApi: boolean;
}

export function createLandingSiteConfigState(
  fromApi: ApiSiteConfig | null | undefined,
  pricesFromApi: boolean,
): LandingSiteConfigState {
  return {
    config: mergeApiSiteConfig(fromApi ?? DEFAULT_API_SITE_CONFIG),
    pricesFromApi,
  };
}

export const DEFAULT_API_SITE_CONFIG: ApiSiteConfig = {
  currencyCode: 'COP',
  currencySymbol: '$',
  planPriceBasic: 39_900,
  planPricePro: 69_900,
  planPriceBusiness: 99_900,
  landing: {
    navBrand: 'Azenda',
    eyebrow: 'Gestión para negocios con citas',
    heroTitle: 'Agenda, ventas anotadas e inventario en un solo lugar',
    heroLead:
      'Reservas por web, panel de operación y todo en pesos colombianos. No cobramos con tarjeta en la app: tú cobras como siempre (efectivo, transferencia, etc.).',
    sectionTitle: 'Lo esencial para el día a día',
    sectionSub: 'Peluquerías, spas, talleres y negocios con cita: reservas claras para el cliente y control para ti.',
    demoTitle: 'Tu página de reservas',
    demoSub:
      'El cliente elige servicio, día y hora en tu enlace. Tú confirmas y cobras por el canal que ya uses.',
    plansSectionTitle: 'Planes simples',
    plansSectionSub: 'Sube de plan cuando necesites más módulos o más equipo.',
    ctaTitle: 'Empieza con Azenda',
    ctaLead: 'Cuenta, servicios y enlace de reservas en pocos pasos.',
    footerNote: '© 2026 Azenda. Todos los derechos reservados.',
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
