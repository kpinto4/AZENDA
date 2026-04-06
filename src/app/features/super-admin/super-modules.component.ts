import { Component, inject } from '@angular/core';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-super-modules',
  templateUrl: './super-modules.component.html',
  styleUrl: './super-modules.component.scss',
})
export class SuperModulesComponent {
  readonly data = inject(MockDataService);
}
