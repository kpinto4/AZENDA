import { Component, computed, inject } from '@angular/core';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-super-dashboard',
  templateUrl: './super-dashboard.component.html',
  styleUrl: './super-dashboard.component.scss',
})
export class SuperDashboardComponent {
  readonly data = inject(MockDataService);
  readonly activeTenantCount = computed(() => this.data.tenants().filter((t) => t.active).length);
}
