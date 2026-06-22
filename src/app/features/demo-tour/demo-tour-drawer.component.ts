import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MockSessionService } from '../../core/services/mock-session.service';
import { DemoTourRole, DemoTourService, DemoTourStep } from './demo-tour.service';

@Component({
  selector: 'app-demo-tour-drawer',
  template: `
    @if (tour.active()) {
      <div class="demo-tour-progress-anchor">
        <button
          type="button"
          class="demo-tour-progress-btn"
          (click)="toggleOpen($event)"
          [attr.aria-expanded]="open()"
          aria-controls="demo-tour-steps-popover"
        >
          Paso {{ stepNumber() }} de {{ totalSteps() }}
          <span class="demo-tour-chevron" aria-hidden="true">{{ open() ? '▴' : '▾' }}</span>
        </button>
        @if (open()) {
          <div
            id="demo-tour-steps-popover"
            class="demo-tour-popover az-card"
            role="dialog"
            aria-label="Lista de pasos del recorrido"
            (click)="$event.stopPropagation()"
          >
            <ol class="demo-tour-list">
              @for (step of progressSteps(); track step.id) {
                <li [class.done]="tour.completed().has(step.id)" [class.current]="isCurrent(step)">
                  <button type="button" class="demo-tour-step-link" (click)="go(step)">
                    {{ step.title }}
                  </button>
                </li>
              }
            </ol>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .demo-tour-progress-anchor {
      position: fixed;
      top: 0.65rem;
      right: 0.75rem;
      z-index: 112;
    }
    .demo-tour-progress-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid color-mix(in srgb, var(--az-accent) 35%, var(--az-border));
      background: var(--az-surface);
      color: var(--az-text);
      border-radius: 999px;
      padding: 0.3rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
    }
    .demo-tour-chevron {
      font-size: 0.65rem;
      opacity: 0.7;
    }
    .demo-tour-popover {
      position: absolute;
      top: calc(100% + 0.4rem);
      right: 0;
      width: min(240px, calc(100vw - 1.5rem));
      max-height: min(320px, 50vh);
      overflow: auto;
      padding: 0.55rem 0.65rem;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
    }
    .demo-tour-list {
      margin: 0;
      padding-left: 1.15rem;
      display: grid;
      gap: 0.25rem;
    }
    .demo-tour-list li {
      font-size: 0.82rem;
      line-height: 1.3;
    }
    .demo-tour-list li.done {
      opacity: 0.55;
      text-decoration: line-through;
    }
    .demo-tour-list li.current {
      font-weight: 600;
    }
    .demo-tour-step-link {
      border: none;
      background: none;
      padding: 0;
      color: inherit;
      cursor: pointer;
      text-align: left;
      font: inherit;
    }
    @media (max-width: 860px) {
      .demo-tour-progress-anchor {
        top: auto;
        bottom: 5.5rem;
        right: 0.75rem;
      }
      .demo-tour-popover {
        bottom: calc(100% + 0.4rem);
        top: auto;
      }
    }
  `,
})
export class DemoTourDrawerComponent {
  readonly tour = inject(DemoTourService);
  private readonly session = inject(MockSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);

  private readonly tourRole = computed<DemoTourRole>(() =>
    this.session.role() === 'EMPLOYEE' ? 'employee' : 'admin',
  );

  readonly progressSteps = computed(() => this.tour.progressSteps(this.tourRole()));

  readonly stepNumber = computed(() => this.tour.stepNumber(this.tourRole()));

  readonly totalSteps = computed(() => this.tour.totalSteps(this.tourRole()));

  constructor() {
    if (typeof document !== 'undefined') {
      const onDocClick = () => this.open.set(false);
      document.addEventListener('click', onDocClick);
      this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick));
    }
  }

  toggleOpen(ev: Event): void {
    ev.stopPropagation();
    this.open.update((v) => !v);
  }

  isCurrent(step: DemoTourStep): boolean {
    return this.tour.currentStep()?.id === step.id;
  }

  go(step: DemoTourStep): void {
    this.open.set(false);
    if (step.externalUrl) {
      window.open(step.externalUrl, '_blank', 'noopener');
      this.tour.completeStep(step.id);
      return;
    }
    const resolved = this.tour.goToStepIdForRole(step.id, this.tourRole());
    if (!resolved) {
      return;
    }
    void this.router.navigateByUrl(resolved.route);
  }
}
