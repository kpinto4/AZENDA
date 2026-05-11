import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

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
  @IsString()
  @MinLength(1)
  employeeId?: string;

  /** Teléfono del cliente (obligatorio si `whatsappReminderConsent` es true; contacto/recordatorio manual desde el negocio). */
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  whatsappReminderConsent?: boolean;
}
