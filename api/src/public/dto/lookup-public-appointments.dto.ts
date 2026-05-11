import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class LookupPublicAppointmentsDto {
  /** Opcional: si se envía no vacío, filtra resultados por nombre como en la reserva. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(2)
  customer?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
