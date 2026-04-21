import { IsIn } from 'class-validator';

export class PatchAppointmentStatusDto {
  @IsIn(['pendiente', 'confirmada', 'cancelada'])
  status!: 'pendiente' | 'confirmada' | 'cancelada';
}
