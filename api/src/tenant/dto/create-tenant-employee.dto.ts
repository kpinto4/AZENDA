import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTenantEmployeeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password?: string;

  /** Solo empleados; el admin del negocio se crea en el alta del tenant. */
  @IsOptional()
  @IsString()
  @IsIn(['EMPLEADO'])
  role?: 'EMPLEADO';
}
