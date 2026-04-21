import { IsString, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @MinLength(1)
  customer!: string;

  @IsString()
  @MinLength(1)
  service!: string;

  @IsString()
  @MinLength(4)
  when!: string;
}
