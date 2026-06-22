import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { ApiAuthService } from '../../core/services/api-auth.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-demo-entry-page',
  imports: [RouterLink],
  template: `
    <div class="demo-entry">
      <p>Preparando la demo interactiva…</p>
      @if (error()) {
        <p class="demo-entry-error">{{ error() }}</p>
        <a routerLink="/" class="az-btn az-btn-secondary">Volver al inicio</a>
      }
    </div>
  `,
  styles: `
    .demo-entry {
      min-height: 60vh;
      display: grid;
      place-content: center;
      gap: 1rem;
      text-align: center;
      padding: 2rem;
    }
    .demo-entry-error {
      color: var(--az-danger, #b91c1c);
    }
  `,
})
export class DemoEntryPageComponent implements OnInit {
  private readonly apiAuth = inject(ApiAuthService);
  private readonly session = inject(MockSessionService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  private loading = false;

  ngOnInit(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.apiAuth
      .demoSession('admin')
      .pipe(
        switchMap((res) => {
          this.session.persistAuthIfRequested(res.accessToken, false);
          return this.session.applyLiveLoginResponse(res);
        }),
        catchError(() => {
          this.error.set(
            'No pudimos iniciar la demo. Verifica que el servidor esté activo e inténtalo de nuevo.',
          );
          return of(undefined);
        }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe(() => {
        if (this.error()) {
          return;
        }
        void this.router.navigate(['/app/panel'], {
          queryParams: { tour: 'start' },
        });
      });
  }
}
