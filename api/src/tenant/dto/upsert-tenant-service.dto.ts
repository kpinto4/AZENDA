import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_SERVICE_DURATION_MINUTES,
  MIN_SERVICE_DURATION_MINUTES,
} from '../../common/service-duration.util';
import { CatalogPromoFieldsDto } from './catalog-promo-fields.dto';

export class UpsertTenantServiceDto extends CatalogPromoFieldsDto {
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
  @Min(MIN_SERVICE_DURATION_MINUTES)
  @Max(MAX_SERVICE_DURATION_MINUTES)
  durationMinutes?: number;
}
