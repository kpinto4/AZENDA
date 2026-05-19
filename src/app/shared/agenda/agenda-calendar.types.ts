import type { MockAppointment } from '../../core/services/mock-data.service';

export type AgendaEventTone = 'primary' | 'accent' | 'neutral';

export interface AgendaCalendarEvent {
  id: string;
  time: string;
  customer: string;
  serviceLabel: string;
  employeeName: string;
  employeeColor: string;
  tone: AgendaEventTone;
  appointment: MockAppointment;
}

export interface AgendaCalendarDay {
  key: string;
  label: string;
  sub: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  events: AgendaCalendarEvent[];
}

export type AgendaCalendarViewMode = 'week' | 'month';
