import { IsOptional, IsString, MinLength } from 'class-validator';

export class ReschedulePublicAppointmentDto {
  @IsString()
  @MinLength(1)
  appointmentId!: string;

  @IsString()
  @MinLength(1)
  customer!: string;

  @IsString()
  @MinLength(4)
  when!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  employeeId?: string;
}
