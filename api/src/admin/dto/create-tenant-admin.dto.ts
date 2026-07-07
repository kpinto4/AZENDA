import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Credenciales del admin del negocio (alta manual o reparación de tenant sin usuario). */
export class CreateTenantAdminDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(6)
  adminPassword!: string;
}
