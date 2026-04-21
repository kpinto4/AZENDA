import { IsIn } from 'class-validator';

export class PatchAppointmentAttendanceDto {
  @IsIn(['PENDIENTE', 'ASISTIO', 'NO_ASISTIO'])
  attendance!: 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';
}
