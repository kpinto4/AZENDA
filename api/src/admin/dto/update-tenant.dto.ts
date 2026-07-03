import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'BLOCKED'])
  status?: 'ACTIVE' | 'PAUSED' | 'BLOCKED';

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  planPriceMonthly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  planPriceYearly?: number;

  @IsOptional()
  @IsBoolean()
  billingCustomized?: boolean;

  @IsOptional()
  @IsString()
  billingNotes?: string;
}
