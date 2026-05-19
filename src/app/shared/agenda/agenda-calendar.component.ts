import { Component, computed, input, output, signal } from '@angular/core';
import type { MockAppointment } from '../../core/services/mock-data.service';
import type { AgendaCalendarEvent, AgendaCalendarViewMode } from './agenda-calendar.types';
import {
  DOW_HEADERS,
  MESES_LARGOS,
  addDays,
  buildMonthDays,
  buildWeekDays,
  startOfDay,
  toYmdLocal,
  visibleMonthDays,
  weekRangeLabel,
} from './agenda-calendar.utils';
import type { EmployeeResolver } from './agenda-calendar.utils';

@Component({
  selector: 'app-agenda-calendar',
  templateUrl: './agenda-calendar.component.html',
  styleUrl: './agenda-calendar.component.scss',
})
export class AgendaCalendarComponent {
  readonly appointments = input<MockAppointment[]>([]);
  readonly employeeColorMap = input<Map<string, string>>(new Map());
  readonly employeeResolver = input<EmployeeResolver>(() => 'Sin asignar');
  readonly compact = input(false);
  readonly title = input('Agenda');
  readonly showViewToggle = input(true);
  readonly showCreateButton = input(false);

  readonly appointmentSelected = output<AgendaCalendarEvent>();
  readonly dayOverflowSelected = output<{ dayKey: string; events: AgendaCalendarEvent[] }>();
  readonly createRequested = output<void>();

  readonly viewMode = signal<AgendaCalendarViewMode>('week');
  readonly anchorDate = signal(startOfDay(new Date()));

  readonly dowHeaders = DOW_HEADERS;

  readonly monthTitle = computed(() => {
    const d = this.anchorDate();
    return `${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
  });

  readonly weekLabel = computed(() => weekRangeLabel(this.weekStart()));

  readonly weekStart = computed(() => {
    const d = this.anchorDate();
    const day = d.getDay();
    const sun = new Date(d);
    sun.setDate(d.getDate() - day);
    sun.setHours(0, 0, 0, 0);
    return sun;
  });

  readonly weekDays = computed(() =>
    buildWeekDays(this.anchorDate(), this.appointments(), this.employeeResolver(), this.employeeColorMap()),
  );

  readonly monthDays = computed(() =>
    visibleMonthDays(
      buildMonthDays(this.anchorDate(), this.appointments(), this.employeeResolver(), this.employeeColorMap()),
    ),
  );

  readonly activeDays = computed(() => (this.viewMode() === 'week' ? this.weekDays() : this.monthDays()));

  readonly totalEvents = computed(() =>
    this.activeDays().reduce((acc, day) => acc + (day.isCurrentMonth === false ? 0 : day.events.length), 0),
  );

  readonly maxVisiblePills = computed(() => (this.compact() ? 2 : 3));

  maxVisibleForDay(dayKey: string): number {
    if (typeof window === 'undefined') {
      return this.maxVisiblePills();
    }
    const w = window.innerWidth;
    if (w <= 360) {
      return 1;
    }
    if (w <= 420) {
      return this.viewMode() === 'month' ? 1 : 2;
    }
    const narrow = w <= 380;
    const base = this.viewMode() === 'month' ? (narrow ? 1 : 2) : narrow ? 2 : this.maxVisiblePills();
    return this.compact() ? Math.min(base, 2) : base;
  }

  visibleEvents(day: { key: string; events: AgendaCalendarEvent[] }): AgendaCalendarEvent[] {
    return day.events.slice(0, this.maxVisibleForDay(day.key));
  }

  hiddenCount(day: { events: AgendaCalendarEvent[] }, visible: AgendaCalendarEvent[]): number {
    return Math.max(0, day.events.length - visible.length);
  }

  shiftPeriod(delta: number): void {
    if (this.viewMode() === 'week') {
      this.anchorDate.update((d) => addDays(d, delta * 7));
      return;
    }
    this.anchorDate.update((d) => {
      const next = new Date(d.getFullYear(), d.getMonth() + delta, 1);
      return startOfDay(next);
    });
  }

  goToday(): void {
    this.anchorDate.set(startOfDay(new Date()));
  }

  toggleViewMode(): void {
    this.viewMode.update((m) => (m === 'week' ? 'month' : 'week'));
  }

  setViewMode(mode: AgendaCalendarViewMode): void {
    this.viewMode.set(mode);
  }

  onPillClick(event: AgendaCalendarEvent, ev: Event): void {
    ev.stopPropagation();
    this.appointmentSelected.emit(event);
  }

  onOverflowClick(day: { key: string; events: AgendaCalendarEvent[] }, ev: Event): void {
    ev.stopPropagation();
    this.dayOverflowSelected.emit({ dayKey: day.key, events: day.events });
  }

  onDayNumberClick(day: { key: string; events: AgendaCalendarEvent[] }, ev: Event): void {
    ev.stopPropagation();
    if (day.events.length) {
      this.dayOverflowSelected.emit({ dayKey: day.key, events: day.events });
    }
  }

  pillLabel(event: AgendaCalendarEvent): string {
    if (this.viewMode() === 'month') {
      return event.customer;
    }
    return event.customer;
  }

  yearBack(): void {
    this.anchorDate.update((d) => startOfDay(new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())));
  }
}
