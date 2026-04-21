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
}

@Injectable({ providedIn: 'root' })
export class ApiPublicMetaService {
  private readonly http = inject(HttpClient);

  getMeta(slug: string): Observable<PublicTenantMetaDto> {
    return this.http.get<PublicTenantMetaDto>(
      `${environment.apiBaseUrl}/public/${encodeURIComponent(slug)}/meta`,
    );
  }
}
