import { IsIn, IsOptional } from 'class-validator';

export class DemoSessionDto {
  @IsOptional()
  @IsIn(['admin', 'employee'])
  role?: 'admin' | 'employee';
}
