import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MockSessionService } from '../../core/services/mock-session.service';
import { DemoTourRole, DemoTourService, DemoTourStep } from './demo-tour.service';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardPos {
  top: number;
  left: number;
}

@Component({
  selector: 'app-demo-tour-step-card',
  template: `
    @if (tour.active() && currentStep(); as step) {
      @if (step.spotlight && spotlightRect(); as rect) {
        <div
          class="demo-tour-highlight"
          aria-hidden="true"
          [style.top.px]="rect.top"
          [style.left.px]="rect.left"
          [style.width.px]="rect.width"
          [style.height.px]="rect.height"
        ></div>
      }
      <div
        class="demo-tour-card az-card"
        role="status"
        [class.demo-tour-card--anchored]="!!step.spotlight"
        [style.top.px]="cardPos()?.top"
        [style.left.px]="cardPos()?.left"
        [class.demo-tour-card--centered]="!step.spotlight"
      >
        <p class="demo-tour-kicker">Paso {{ stepNumber() }} de {{ totalSteps() }}</p>
        <h4>{{ step.title }}</h4>
        <p class="demo-tour-intro">{{ step.intro }}</p>
        @if (step.bullets?.length) {
          <ol class="demo-tour-steps-list">
            @for (b of step.bullets; track b) {
              <li>{{ b }}</li>
            }
          </ol>
        }
        @if (gateHint(); as hint) {
          <p class="demo-tour-gate" role="status">{{ hint }}</p>
        }
        <div class="demo-tour-card-actions">
          <button
            type="button"
            class="az-btn az-btn-primary"
            [disabled]="!canAdvance()"
            (click)="onNext(step)"
          >
            {{ step.nextLabel ?? (step.externalUrl ? 'Abrir en otra pestaña' : 'Siguiente') }}
          </button>
          <button type="button" class="az-btn az-btn-ghost" (click)="tour.skip()">Cerrar guía</button>
        </div>
      </div>
    }
  `,
  styles: `
    .demo-tour-highlight {
      position: fixed;
      z-index: 109;
      border-radius: 14px;
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.58);
      pointer-events: none;
      transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
    }
    .demo-tour-card {
      position: fixed;
      z-index: 111;
      width: min(360px, calc(100vw - 2rem));
      padding: 1rem 1.05rem;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.22);
    }
    .demo-tour-card--centered {
      left: 50%;
      bottom: 1rem;
      transform: translateX(-50%);
      top: auto !important;
    }
    .demo-tour-kicker {
      margin: 0 0 0.25rem;
      font-size: 0.78rem;
      opacity: 0.75;
    }
    .demo-tour-card h4 {
      margin: 0 0 0.45rem;
    }
    .demo-tour-intro {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.5;
      color: var(--az-text-muted, #475569);
    }
    .demo-tour-steps-list {
      margin: 0.6rem 0 0;
      padding-left: 1.2rem;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .demo-tour-gate {
      margin: 0.65rem 0 0;
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--az-accent) 12%, var(--az-surface));
      font-size: 0.84rem;
      line-height: 1.4;
    }
    .demo-tour-card-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.85rem;
    }
  `,
})
export class DemoTourStepCardComponent {
  readonly tour = inject(DemoTourService);
  private readonly session = inject(MockSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly spotlightRect = signal<SpotlightRect | null>(null);
  readonly cardPos = signal<CardPos | null>(null);

  private readonly tourRole = computed<DemoTourRole>(() =>
    this.session.role() === 'EMPLOYEE' ? 'employee' : 'admin',
  );

  readonly currentStep = computed(() => this.tour.currentStep());

  readonly stepNumber = computed(() => this.tour.stepNumber(this.tourRole()));

  readonly totalSteps = computed(() => this.tour.totalSteps(this.tourRole()));

  readonly canAdvance = computed(() => this.tour.canAdvance(this.tourRole()));

  readonly gateHint = computed(() => this.tour.gateHint(this.tourRole()));

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        untracked(() => this.refreshLayout());
      });

    if (typeof window !== 'undefined') {
      const onReflow = () => this.refreshLayout();
      window.addEventListener('resize', onReflow);
      window.addEventListener('scroll', onReflow, true);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onReflow);
        window.removeEventListener('scroll', onReflow, true);
      });
    }

    effect(() => {
      this.tourRole();
      const step = this.currentStep();
      if (!step) {
        this.spotlightRect.set(null);
        this.cardPos.set(null);
        return;
      }
      untracked(() => {
        window.setTimeout(() => this.refreshLayout(step), 80);
      });
    });
  }

  onNext(step: DemoTourStep): void {
    if (!this.tour.canAdvance(this.tourRole())) {
      return;
    }
    if (step.externalUrl) {
      window.open(step.externalUrl, '_blank', 'noopener');
    }
    const next = this.tour.advanceNext(this.tourRole());
    if (!next) {
      return;
    }
    const currentPath = this.router.url.split('?')[0];
    if (next.route !== currentPath) {
      void this.router.navigateByUrl(next.route);
      return;
    }
    this.refreshLayout(next);
  }

  private refreshLayout(step = this.currentStep() ?? undefined): void {
    if (!step?.spotlight || typeof document === 'undefined') {
      this.spotlightRect.set(null);
      this.cardPos.set(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.spotlight}"]`);
    if (!(el instanceof HTMLElement)) {
      this.spotlightRect.set(null);
      this.cardPos.set(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    window.setTimeout(() => {
      const pad = 10;
      const r = el.getBoundingClientRect();
      const rect: SpotlightRect = {
        top: Math.max(8, r.top - pad),
        left: Math.max(8, r.left - pad),
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      };
      this.spotlightRect.set(rect);
      this.cardPos.set(this.computeCardPosition(rect));
    }, 280);
  }

  private computeCardPosition(rect: SpotlightRect): CardPos {
    const cardW = Math.min(360, window.innerWidth - 32);
    const cardH = 280;
    const margin = 14;

    // Controles del banner (arriba): tarjeta abajo para no tapar el panel
    if (rect.top < 150) {
      return {
        top: Math.max(12, window.innerHeight - cardH - 20),
        left: Math.max(16, (window.innerWidth - cardW) / 2),
      };
    }

    let top = rect.top + rect.height + margin;
    if (top + cardH > window.innerHeight - 12) {
      top = Math.max(12, rect.top - cardH - margin);
    }
    let left = rect.left;
    if (left + cardW > window.innerWidth - 16) {
      left = window.innerWidth - cardW - 16;
    }
    left = Math.max(16, left);
    return { top, left };
  }
}
