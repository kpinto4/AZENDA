import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-super-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './super-shell.component.html',
  styleUrl: './super-shell.component.scss',
})
export class SuperShellComponent {
  readonly session = inject(MockSessionService);
  private readonly router = inject(Router);

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }
}
