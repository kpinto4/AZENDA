import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AppSystem, UserRole } from '../../auth/auth.types';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLEADO, UserRole.CLIENTE_FINAL])
  role!: UserRole;

  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @IsArray()
  @IsIn([AppSystem.SUPER_ADMIN, AppSystem.TENANT, AppSystem.PUBLIC_BOOKING], {
    each: true,
  })
  systems!: AppSystem[];

  @IsIn(['ACTIVE', 'PAUSED', 'BLOCKED'])
  status!: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
}
