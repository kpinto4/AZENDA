import { IsIn, IsString } from 'class-validator';

export class AdminUpgradeQuoteDto {
  @IsString()
  @IsIn(['Trial', 'Básico', 'Pro', 'Negocio'])
  targetPlan!: string;

  @IsIn(['MONTHLY', 'YEARLY'])
  targetCycle!: 'MONTHLY' | 'YEARLY';
}
