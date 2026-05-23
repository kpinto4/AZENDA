import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreatePublicAppointmentDto {
  @IsString()
  @MinLength(1)
  customer!: string;

  @IsString()
  @MinLength(1)
  service!: string;

  @IsString()
  @MinLength(4)
  when!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(960)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  employeeId?: string;

  /** Teléfono del cliente (obligatorio si `whatsappReminderConsent` es true; contacto/recordatorio manual desde el negocio). */
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @Transform(
    ({ value }) =>
      value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean()
  whatsappReminderConsent?: boolean;
}
