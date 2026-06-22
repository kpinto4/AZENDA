import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { ApiAuthService } from '../../core/services/api-auth.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { DemoTourService } from '../demo-tour/demo-tour.service';

export type DemoShowcaseRole = 'admin' | 'employee';

@Component({
  selector: 'app-demo-role-switch',
  template: `
    <div class="demo-role-switch" role="group" aria-label="Vista del panel demo">
      <span class="demo-role-label">Vista:</span>
      <button
        type="button"
        class="demo-role-btn"
        [class.active]="currentRole() === 'admin'"
        [disabled]="busy()"
        (click)="switchRole('admin')"
      >
        Administrador
      </button>
      <button
        type="button"
        class="demo-role-btn"
        [class.active]="currentRole() === 'employee'"
        [disabled]="busy()"
        (click)="switchRole('employee')"
      >
        Empleado (Laura)
      </button>
      @if (toast()) {
        <span class="demo-role-toast" role="status">{{ toast() }}</span>
      }
    </div>
  `,
  styles: `
    .demo-role-switch {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
    }
    .demo-role-label {
      font-size: 0.82rem;
      opacity: 0.85;
    }
    .demo-role-btn {
      border: 1px solid color-mix(in srgb, var(--az-accent) 35%, var(--az-border));
      background: var(--az-surface);
      color: var(--az-text);
      border-radius: 999px;
      padding: 0.25rem 0.65rem;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .demo-role-btn.active {
      background: color-mix(in srgb, var(--az-accent) 18%, var(--az-surface));
      border-color: var(--az-accent);
      font-weight: 600;
    }
    .demo-role-btn:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .demo-role-toast {
      font-size: 0.78rem;
      opacity: 0.9;
    }
  `,
})
export class DemoRoleSwitchComponent {
  private readonly apiAuth = inject(ApiAuthService);
  private readonly session = inject(MockSessionService);
  private readonly router = inject(Router);
  private readonly tour = inject(DemoTourService);

  readonly busy = signal(false);
  readonly toast = signal<string | null>(null);

  readonly currentRole = computed<DemoShowcaseRole>(() =>
    this.session.role() === 'EMPLOYEE' ? 'employee' : 'admin',
  );

  switchRole(role: DemoShowcaseRole): void {
    if (this.busy() || this.currentRole() === role) {
      return;
    }
    this.busy.set(true);
    this.toast.set(null);
    let failed = false;
    this.apiAuth
      .demoSession(role)
      .pipe(
        switchMap((res) => {
          this.session.persistAuthIfRequested(res.accessToken, false);
          return this.session.applyLiveLoginResponse(res);
        }),
        catchError(() => {
          failed = true;
          return of(undefined);
        }),
      )
      .subscribe(() => {
        this.busy.set(false);
        if (failed) {
          this.toast.set('No se pudo cambiar la vista. Intenta de nuevo.');
          return;
        }
        const url = this.router.url;
        if (
          role === 'employee' &&
          (url.includes('/app/empleados') || url.includes('/app/configuracion'))
        ) {
          void this.router.navigateByUrl('/app/panel');
        }
        this.tour.onDemoRoleChanged(role);
        this.toast.set(
          role === 'employee'
            ? 'Ahora ves el panel como empleado (Laura Demo).'
            : 'Vista de administrador restaurada.',
        );
        setTimeout(() => this.toast.set(null), 4000);
      });
  }
}
