import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api-base-url';
import type { CatalogPromoFields } from '../promo-schedule.util';

export interface PublicTenantMetaDto {
  slug: string;
  name: string;
  active: boolean;
  plan: string;
  modules: { citas: boolean; ventas: boolean; inventario: boolean };
  storefrontEnabled: boolean;
  catalogoActivo: boolean;
  branding?: {
    displayName: string;
    logoUrl: string | null;
    publicAddress: string | null;
    publicMapsUrl: string | null;
    cancellationPolicy: string | null;
    reminderNotice: string | null;
    whatsappPhoneE164?: string | null;
    whatsappDefaultMessage?: string | null;
    publicBookingHoursJson?: string | null;
    reviewsUrl?: string | null;
    posPaymentMethodsJson?: string;
    catalogLayout: 'horizontal' | 'grid';
    primaryColor: string;
    accentColor: string;
    bgColor: string;
    surfaceColor: string;
    textColor: string;
    borderRadiusPx: number;
    useGradient: boolean;
    gradientFrom: string;
    gradientTo: string;
    gradientAngleDeg: number;
  };
}

export interface PublicCatalogDto {
  products: Array<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    price: number;
    sku: string;
    stock: number;
    catalogOrder: number;
    imageUrl: string | null;
  } & CatalogPromoFields>;
  services: Array<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    price: number;
    durationMinutes: number;
    catalogOrder: number;
  } & CatalogPromoFields>;
  employees: Array<{
    id: string;
    name: string;
    role: 'ADMIN' | 'EMPLEADO';
  }>;
  branding: NonNullable<PublicTenantMetaDto['branding']>;
}

export interface PublicAvailabilityDto {
  date: string;
  durationMinutes?: number;
  slotsByEmployee: Record<string, string[]>;
  allSlots: string[];
  employees: Array<{
    id: string;
    name: string;
    role: 'ADMIN' | 'EMPLEADO';
  }>;
}

@Injectable({ providedIn: 'root' })
export class ApiPublicMetaService {
  private readonly http = inject(HttpClient);

  getMeta(slug: string): Observable<PublicTenantMetaDto> {
    return this.http.get<PublicTenantMetaDto>(
      `${apiBaseUrl()}/public/${encodeURIComponent(slug)}/meta`,
    );
  }

  getCatalog(slug: string): Observable<PublicCatalogDto> {
    return this.http.get<PublicCatalogDto>(
      `${apiBaseUrl()}/public/${encodeURIComponent(slug)}/catalog`,
    );
  }

  getAvailability(
    slug: string,
    date: string,
    durationMinutes?: number,
  ): Observable<PublicAvailabilityDto> {
    let url = `${apiBaseUrl()}/public/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`;
    if (durationMinutes != null && durationMinutes > 0) {
      url += `&durationMinutes=${encodeURIComponent(String(durationMinutes))}`;
    }
    return this.http.get<PublicAvailabilityDto>(url);
  }
}
