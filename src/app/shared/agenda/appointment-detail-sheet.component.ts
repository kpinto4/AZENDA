import { Component, computed, input, output } from '@angular/core';
import type { MockAppointment, MockAppointmentAttendance } from '../../core/services/mock-data.service';
import type { AgendaCalendarEvent } from './agenda-calendar.types';
import { cleanServiceLabel, formatWhenDisplay } from './agenda-calendar.utils';

export type AppointmentSheetMode = 'detail' | 'day-list' | 'create';

@Component({
  selector: 'app-appointment-detail-sheet',
  templateUrl: './appointment-detail-sheet.component.html',
  styleUrl: './appointment-detail-sheet.component.scss',
})
export class AppointmentDetailSheetComponent {
  readonly open = input(false);
  readonly mode = input<AppointmentSheetMode>('detail');
  readonly appointment = input<MockAppointment | null>(null);
  readonly dayEvents = input<AgendaCalendarEvent[]>([]);
  readonly dayLabel = input('');
  readonly employeeName = input('');
  readonly useRemote = input(false);
  readonly restricted = input(false);
  readonly waLink = input<string | null>(null);
  readonly attendanceOptions = input<{ value: MockAppointmentAttendance; label: string }[]>([]);

  readonly closed = output<void>();
  readonly attendanceChange = output<{ id: string; value: MockAppointmentAttendance }>();
  readonly markReminderDone = output<string>();
  readonly eventSelected = output<AgendaCalendarEvent>();

  readonly serviceLabel = computed(() => {
    const a = this.appointment();
    return a ? cleanServiceLabel(a.service) : '';
  });

  readonly whenDisplay = computed(() => {
    const a = this.appointment();
    return a ? formatWhenDisplay(a.when) : '';
  });

  readonly appointmentTimeLabel = computed(() => {
    const parts = this.whenDisplay().split(',');
    return parts.length > 1 ? parts[1].trim() : this.whenDisplay();
  });

  readonly statusLabel = computed(() => {
    const s = this.appointment()?.status;
    if (s === 'confirmada') {
      return 'Confirmada';
    }
    if (s === 'cancelada') {
      return 'Cancelada';
    }
    return 'Pendiente';
  });

  readonly statusClass = computed(() => {
    const s = this.appointment()?.status;
    if (s === 'confirmada') {
      return 'ok';
    }
    if (s === 'cancelada') {
      return 'cancelled';
    }
    return 'pending';
  });

  onBackdropClick(): void {
    this.closed.emit();
  }

  onPanelClick(ev: Event): void {
    ev.stopPropagation();
  }

  onAttendance(id: string, value: MockAppointmentAttendance): void {
    this.attendanceChange.emit({ id, value });
  }

  selectDayEvent(ev: AgendaCalendarEvent): void {
    this.eventSelected.emit(ev);
  }
}
