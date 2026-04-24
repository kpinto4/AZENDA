import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
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
  private readonly destroyRef = inject(DestroyRef);

  /** En móvil el menú se abre como panel lateral. */
  readonly menuOpen = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (window.innerWidth > 860) {
          this.menuOpen.set(false);
        }
      });
    }

    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      const open = this.menuOpen();
      const narrow = typeof window !== 'undefined' && window.innerWidth <= 860;
      document.body.style.overflow = open && narrow ? 'hidden' : '';
    });
  }

  logout(): void {
    this.menuOpen.set(false);
    this.session.logout();
    void this.router.navigateByUrl('/');
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onSidebarPointerDown(ev: Event): void {
    const el = ev.target as HTMLElement | null;
    if (el?.closest('a')) {
      this.closeMenu();
    }
  }
}
