import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTenantModulesDto {
  @IsOptional()
  @IsBoolean()
  citas?: boolean;

  @IsOptional()
  @IsBoolean()
  ventas?: boolean;

  @IsOptional()
  @IsBoolean()
  inventario?: boolean;
}
