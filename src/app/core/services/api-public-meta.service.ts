import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    promoPrice: number | null;
    sku: string;
    stock: number;
    catalogOrder: number;
    imageUrl: string | null;
  }>;
  services: Array<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    price: number;
    promoPrice: number | null;
    promoLabel: string | null;
    catalogOrder: number;
  }>;
  employees: Array<{
    id: string;
    name: string;
    role: 'ADMIN' | 'EMPLEADO';
  }>;
  branding: NonNullable<PublicTenantMetaDto['branding']>;
}

export interface PublicAvailabilityDto {
  date: string;
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
      `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/meta`,
    );
  }

  getCatalog(slug: string): Observable<PublicCatalogDto> {
    return this.http.get<PublicCatalogDto>(
      `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/catalog`,
    );
  }

  getAvailability(slug: string, date: string): Observable<PublicAvailabilityDto> {
    return this.http.get<PublicAvailabilityDto>(
      `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`,
    );
  }
}
