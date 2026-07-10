import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api-base-url';
import type { CatalogPromoFields } from '../promo-schedule.util';

export interface ApiTenantBrandingDto {
  tenantId: string;
  displayName: string;
  logoUrl: string | null;
  publicAddress: string | null;
  publicMapsUrl: string | null;
  cancellationPolicy: string | null;
  reminderNotice: string | null;
  whatsappPhoneE164: string | null;
  whatsappDefaultMessage: string | null;
  publicBookingHoursJson: string | null;
  reviewsUrl: string | null;
  posPaymentMethodsJson: string;
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
}

export type CatalogPromoPayload = CatalogPromoFields;

export interface ApiTenantProductDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  stock: number;
  catalogOrder: number;
  imageUrl: string | null;
  promoPrice: number | null;
  promoEnabled: boolean;
  promoScheduleType: CatalogPromoFields['promoScheduleType'];
  promoDays: number[];
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoLabel: string | null;
}

export interface ApiTenantServiceDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  catalogOrder: number;
  promoPrice: number | null;
  promoEnabled: boolean;
  promoScheduleType: CatalogPromoFields['promoScheduleType'];
  promoDays: number[];
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoLabel: string | null;
}

export interface ApiTenantCatalogResponse {
  products: ApiTenantProductDto[];
  services: ApiTenantServiceDto[];
  branding: ApiTenantBrandingDto;
}

export interface ApiTenantStockMovementDto {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiTenantCatalogService {
  private readonly http = inject(HttpClient);

  getCatalog(): Observable<ApiTenantCatalogResponse> {
    return this.http.get<ApiTenantCatalogResponse>(`${apiBaseUrl()}/tenant/catalog`);
  }

  createProduct(body: {
    name: string;
    description?: string | null;
    price: number;
    sku: string;
    stock: number;
    imageUrl?: string | null;
  } & CatalogPromoPayload): Observable<ApiTenantProductDto> {
    return this.http.post<ApiTenantProductDto>(`${apiBaseUrl()}/tenant/catalog/products`, body);
  }

  updateProduct(
    productId: string,
    body: {
      name: string;
      description?: string | null;
      price: number;
      sku: string;
      stock: number;
      imageUrl?: string | null;
    } & CatalogPromoPayload,
  ): Observable<ApiTenantProductDto> {
    return this.http.patch<ApiTenantProductDto>(
      `${apiBaseUrl()}/tenant/catalog/products/${encodeURIComponent(productId)}`,
      body,
    );
  }

  deleteProduct(productId: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(
      `${apiBaseUrl()}/tenant/catalog/products/${encodeURIComponent(productId)}`,
    );
  }

  moveProduct(productId: string, direction: -1 | 1): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(
      `${apiBaseUrl()}/tenant/catalog/products/${encodeURIComponent(productId)}/move`,
      { direction },
    );
  }

  createService(body: {
    name: string;
    description?: string | null;
    price: number;
    durationMinutes?: number;
  } & CatalogPromoPayload): Observable<ApiTenantServiceDto> {
    return this.http.post<ApiTenantServiceDto>(`${apiBaseUrl()}/tenant/catalog/services`, body);
  }

  updateService(
    serviceId: string,
    body: {
      name: string;
      description?: string | null;
      price: number;
      durationMinutes?: number;
    } & CatalogPromoPayload,
  ): Observable<ApiTenantServiceDto> {
    return this.http.patch<ApiTenantServiceDto>(
      `${apiBaseUrl()}/tenant/catalog/services/${encodeURIComponent(serviceId)}`,
      body,
    );
  }

  deleteService(serviceId: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(
      `${apiBaseUrl()}/tenant/catalog/services/${encodeURIComponent(serviceId)}`,
    );
  }

  moveService(serviceId: string, direction: -1 | 1): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(
      `${apiBaseUrl()}/tenant/catalog/services/${encodeURIComponent(serviceId)}/move`,
      { direction },
    );
  }

  patchBranding(
    body: Partial<Omit<ApiTenantBrandingDto, 'tenantId'>>,
  ): Observable<ApiTenantBrandingDto> {
    return this.http.patch<ApiTenantBrandingDto>(`${apiBaseUrl()}/tenant/branding`, body);
  }

  listStockMovements(): Observable<ApiTenantStockMovementDto[]> {
    return this.http.get<ApiTenantStockMovementDto[]>(`${apiBaseUrl()}/tenant/inventory/movements`);
  }

  applyStockMovement(body: {
    productId: string;
    delta: number;
    reason: string;
  }): Observable<ApiTenantStockMovementDto> {
    return this.http.post<ApiTenantStockMovementDto>(
      `${apiBaseUrl()}/tenant/inventory/movements`,
      body,
    );
  }
}
