import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  id!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsIn(['ACTIVE', 'PAUSED', 'BLOCKED'])
  status!: 'ACTIVE' | 'PAUSED' | 'BLOCKED';

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(6)
  adminPassword!: string;

  @IsOptional()
  @IsBoolean()
  citas?: boolean;

  @IsOptional()
  @IsBoolean()
  ventas?: boolean;

  @IsOptional()
  @IsBoolean()
  inventario?: boolean;

  @IsOptional()
  @IsIn(['Trial', 'Básico', 'Pro', 'Negocio'])
  plan?: string;

  @IsOptional()
  @IsBoolean()
  storefrontEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  manualBookingEnabled?: boolean;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';
}
