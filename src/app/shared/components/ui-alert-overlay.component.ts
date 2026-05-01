import { Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { UiAlertService } from '../../core/services/ui-alert.service';

@Component({
  selector: 'app-ui-alert-overlay',
  imports: [NgClass],
  templateUrl: './ui-alert-overlay.component.html',
  styleUrl: './ui-alert-overlay.component.scss',
})
export class UiAlertOverlayComponent {
  readonly alerts = inject(UiAlertService);
  readonly current = this.alerts.current;
  readonly icon = computed(() => {
    const k = this.current()?.kind;
    if (k === 'success') {
      return '✓';
    }
    if (k === 'error') {
      return '✕';
    }
    if (k === 'warning') {
      return '!';
    }
    if (k === 'confirm') {
      return '?';
    }
    return 'i';
  });
}

