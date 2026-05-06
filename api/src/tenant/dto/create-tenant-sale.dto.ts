import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

function trimOrUndef(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const t = value.trim();
  return t === '' ? undefined : t;
}

export class CreateTenantSaleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  total!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(64)
  method!: string;

  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  @MaxLength(32)
  saleDate?: string;

  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  @MaxLength(128)
  linkedAppointmentId?: string;

  @IsOptional()
  @Transform(({ value }) => trimOrUndef(value))
  @IsString()
  @MaxLength(128)
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}
