import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertTenantProductDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoPrice?: number | null;

  @IsString()
  @MaxLength(80)
  sku!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}
