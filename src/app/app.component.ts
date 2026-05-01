import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiAlertOverlayComponent } from './shared/components/ui-alert-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiAlertOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'azenda';
}
