import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @MinLength(1)
  customer!: string;

  @IsString()
  @MinLength(1)
  service!: string;

  @IsString()
  @MinLength(4)
  when!: string;

  /** Profesional asignado (opcional; si falta, se elige uno libre). */
  @IsOptional()
  @IsString()
  employeeId?: string;
}
