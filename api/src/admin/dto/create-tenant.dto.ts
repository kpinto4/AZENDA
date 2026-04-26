import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
}
