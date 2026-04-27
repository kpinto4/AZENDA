import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @IsString()
  @IsIn(['ADMIN', 'EMPLEADO'])
  role!: 'ADMIN' | 'EMPLEADO';
}
