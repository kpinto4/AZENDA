import { Component, computed, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-tenant-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './tenant-shell.component.html',
  styleUrl: './tenant-shell.component.scss',
})
export class TenantShellComponent {
  readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);
  private readonly router = inject(Router);

  readonly currentTenant = computed(() => {
    const id = this.session.tenantId();
    if (!id) {
      return undefined;
    }
    return this.data.tenants().find((t) => t.id === id);
  });

  constructor() {
    effect(() => {
      const id = this.session.tenantId();
      const tenants = this.data.tenants();
      if (!id) {
        return;
      }
      const t = tenants.find((x) => x.id === id);
      if (t) {
        this.session.syncFromTenant(t);
      }
    });
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }
}
