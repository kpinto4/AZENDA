import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

export class PlanCatalogRowDto {
  @IsString()
  @IsIn(['Trial', 'Básico', 'Pro', 'Negocio'])
  planKey!: string;

  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @IsNumber()
  @Min(0)
  priceYearly!: number;
}

export class ReplacePlanCatalogDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanCatalogRowDto)
  entries!: PlanCatalogRowDto[];
}
