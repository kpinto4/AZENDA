import { IsString, MinLength } from 'class-validator';

export class CreatePublicStoreVisitDto {
  @IsString()
  @MinLength(1)
  customer!: string;

  @IsString()
  @MinLength(3)
  detail!: string;
}
