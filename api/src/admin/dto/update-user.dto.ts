import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AppSystem, UserRole } from '../../auth/auth.types';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLEADO, UserRole.CLIENTE_FINAL])
  role?: UserRole;

  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @IsOptional()
  @IsArray()
  @IsIn([AppSystem.SUPER_ADMIN, AppSystem.TENANT, AppSystem.PUBLIC_BOOKING], {
    each: true,
  })
  systems?: AppSystem[];

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'BLOCKED'])
  status?: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
}
