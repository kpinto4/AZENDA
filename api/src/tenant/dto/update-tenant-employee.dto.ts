import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTenantEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'EMPLEADO'])
  role?: 'ADMIN' | 'EMPLEADO';
}
