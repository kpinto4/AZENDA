import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTenantBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  /** Dirección u orientación para el cliente (reserva pública). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  publicAddress?: string;

  /** URL de mapa o ficha externa (opcional). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  publicMapsUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  cancellationPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reminderNotice?: string;

  /** Dígitos E.164 sin + (wa.me del negocio). */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsappPhoneE164?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  whatsappDefaultMessage?: string | null;

  /** JSON horario reserva pública (días mon–sun, franjas {open,close}). */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  publicBookingHoursJson?: string | null;

  /** Enlace para dejar reseña (Google Maps, etc.). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewsUrl?: string | null;

  /** JSON métodos de pago POS: [{id,label,enabled,detail},…]. */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  posPaymentMethodsJson?: string | null;

  @IsOptional()
  @IsIn(['horizontal', 'grid'])
  catalogLayout?: 'horizontal' | 'grid';

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  surfaceColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(28)
  borderRadiusPx?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useGradient?: boolean;

  @IsOptional()
  @IsString()
  gradientFrom?: string;

  @IsOptional()
  @IsString()
  gradientTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(360)
  gradientAngleDeg?: number;
}
