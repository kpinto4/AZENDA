import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTenantBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsIn(['horizontal', 'grid'])
  catalogLayout?: 'horizontal' | 'grid';

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  surfaceColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(28)
  borderRadiusPx?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useGradient?: boolean;

  @IsOptional()
  @IsString()
  gradientFrom?: string;

  @IsOptional()
  @IsString()
  gradientTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(360)
  gradientAngleDeg?: number;
}
