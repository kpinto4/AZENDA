import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { PromoScheduleType } from '../../common/promo-schedule.util';

export class CatalogPromoFieldsDto {
  @IsOptional()
  @IsBoolean()
  promoEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoPrice?: number | null;

  @IsOptional()
  @IsIn(['always', 'weekdays', 'date_range'])
  promoScheduleType?: PromoScheduleType | null;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  promoDays?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  promoStartDate?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  promoEndDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  promoLabel?: string | null;
}
