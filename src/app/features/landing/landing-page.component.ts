import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly router = inject(Router);
  private readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);

  enterSuperDemo(): void {
    this.session.loginAsSuperAdmin();
    void this.router.navigateByUrl('/super/panel');
  }

  enterTenantDemo(): void {
    const t = this.data.tenantById('t1');
    if (t) {
      this.session.loginFromTenant(t, { userName: 'María López', role: 'TENANT_ADMIN' });
    } else {
      this.session.loginAsTenantAdmin();
    }
    void this.router.navigateByUrl('/app');
  }

  openBookingDemo(): void {
    void this.router.navigateByUrl('/reservar/barberia-centro');
  }

  resetDemo(): void {
    this.session.logout();
    this.data.resetDemo();
  }
}
