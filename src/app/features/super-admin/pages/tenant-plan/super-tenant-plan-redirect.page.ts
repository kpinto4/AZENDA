import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Redirige la ruta antigua de plan/facturación al desplegable en Negocios. */
@Component({
  selector: 'app-super-tenant-plan-redirect',
  template: `<p class="super-ui-lead">Redirigiendo…</p>`,
})
export class SuperTenantPlanRedirectPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    void this.router.navigate(['/super/tenants'], {
      queryParams: tenantId ? { facturacion: tenantId } : {},
    });
  }
}
