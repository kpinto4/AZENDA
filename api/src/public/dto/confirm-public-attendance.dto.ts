import { IsString, MinLength } from 'class-validator';

export class ConfirmPublicAttendanceDto {
  @IsString()
  @MinLength(3)
  appointmentId!: string;

  @IsString()
  @MinLength(1)
  customer!: string;
}
