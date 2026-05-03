import { IsIn, IsString } from 'class-validator';

export class SimulateUpgradeDto {
  @IsString()
  targetPlan!: string;

  @IsIn(['MONTHLY', 'YEARLY'])
  targetCycle!: 'MONTHLY' | 'YEARLY';
}

