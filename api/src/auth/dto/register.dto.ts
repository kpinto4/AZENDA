import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { BillingCycle } from '../../infrastructure/sql-db/sql-db.types';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  business!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsIn(['Básico', 'Pro', 'Negocio'])
  selectedPlan?: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingCycle?: BillingCycle;
}
