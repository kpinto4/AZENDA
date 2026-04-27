import { Type } from 'class-transformer';
import { IsInt, IsIn } from 'class-validator';

export class MoveCatalogItemDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([-1, 1])
  direction!: -1 | 1;
}
