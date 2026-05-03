import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PatchSiteConfigLandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  navBrand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  eyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  heroLead?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sectionTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sectionSub?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  demoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  demoSub?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  plansSectionTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  plansSectionSub?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ctaLead?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  demoBannerText?: string;
}

export class PatchSiteConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currencySymbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  planPriceBasic?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  planPricePro?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  planPriceBusiness?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PatchSiteConfigLandingDto)
  landing?: PatchSiteConfigLandingDto;
}
