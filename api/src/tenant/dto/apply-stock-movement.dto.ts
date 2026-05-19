import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyStockMovementDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @Type(() => Number)
  @IsInt()
  delta!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
