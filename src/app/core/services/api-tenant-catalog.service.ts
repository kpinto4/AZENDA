import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiTenantBrandingDto {
  tenantId: string;
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
}

export interface ApiTenantProductDto {
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
}

export interface ApiTenantServiceDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  promoPrice: number | null;
  promoLabel: string | null;
  catalogOrder: number;
}

export interface ApiTenantCatalogResponse {
  products: ApiTenantProductDto[];
  services: ApiTenantServiceDto[];
  branding: ApiTenantBrandingDto;
}

@Injectable({ providedIn: 'root' })
export class ApiTenantCatalogService {
  private readonly http = inject(HttpClient);

  getCatalog(): Observable<ApiTenantCatalogResponse> {
    return this.http.get<ApiTenantCatalogResponse>(`${environment.apiBaseUrl}/tenant/catalog`);
  }

  createProduct(body: {
    name: string;
    description?: string | null;
    price: number;
    promoPrice?: number | null;
    sku: string;
    stock: number;
    imageUrl?: string | null;
  }): Observable<ApiTenantProductDto> {
    return this.http.post<ApiTenantProductDto>(`${environment.apiBaseUrl}/tenant/catalog/products`, body);
  }

  updateProduct(
    productId: string,
    body: {
      name: string;
      description?: string | null;
      price: number;
      promoPrice?: number | null;
      sku: string;
      stock: number;
      imageUrl?: string | null;
    },
  ): Observable<ApiTenantProductDto> {
    return this.http.patch<ApiTenantProductDto>(
      `${environment.apiBaseUrl}/tenant/catalog/products/${encodeURIComponent(productId)}`,
      body,
    );
  }

  deleteProduct(productId: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(
      `${environment.apiBaseUrl}/tenant/catalog/products/${encodeURIComponent(productId)}`,
    );
  }

  moveProduct(productId: string, direction: -1 | 1): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(
      `${environment.apiBaseUrl}/tenant/catalog/products/${encodeURIComponent(productId)}/move`,
      { direction },
    );
  }

  createService(body: {
    name: string;
    description?: string | null;
    price: number;
    promoPrice?: number | null;
    promoLabel?: string | null;
  }): Observable<ApiTenantServiceDto> {
    return this.http.post<ApiTenantServiceDto>(`${environment.apiBaseUrl}/tenant/catalog/services`, body);
  }

  updateService(
    serviceId: string,
    body: {
      name: string;
      description?: string | null;
      price: number;
      promoPrice?: number | null;
      promoLabel?: string | null;
    },
  ): Observable<ApiTenantServiceDto> {
    return this.http.patch<ApiTenantServiceDto>(
      `${environment.apiBaseUrl}/tenant/catalog/services/${encodeURIComponent(serviceId)}`,
      body,
    );
  }

  deleteService(serviceId: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(
      `${environment.apiBaseUrl}/tenant/catalog/services/${encodeURIComponent(serviceId)}`,
    );
  }

  moveService(serviceId: string, direction: -1 | 1): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(
      `${environment.apiBaseUrl}/tenant/catalog/services/${encodeURIComponent(serviceId)}/move`,
      { direction },
    );
  }

  patchBranding(
    body: Partial<Omit<ApiTenantBrandingDto, 'tenantId'>>,
  ): Observable<ApiTenantBrandingDto> {
    return this.http.patch<ApiTenantBrandingDto>(`${environment.apiBaseUrl}/tenant/branding`, body);
  }
}
