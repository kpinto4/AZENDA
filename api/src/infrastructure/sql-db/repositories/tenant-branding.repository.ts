import { Injectable } from '@nestjs/common';
import { PgClientService } from '../pg-client.service';
import { TenantBrandingEntity } from '../sql-db.types';
import { mapTenantBrandingRow } from '../tenant-branding-row.mapper';
import { TenantRepository } from './tenant.repository';
import {
  defaultPosPaymentMethodsJson,
  parsePosPaymentMethodsJson,
} from '../../../tenant/default-pos-payment-methods';

const BRANDING_SELECT = `
  SELECT tenant_id, display_name, logo_url, public_address, public_maps_url, cancellation_policy, reminder_notice,
         whatsapp_phone_e164, whatsapp_default_message, public_booking_hours_json, reviews_url, pos_payment_methods_json,
         catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
         border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
  FROM tenant_branding
`;

@Injectable()
export class TenantBrandingRepository {
  constructor(
    private readonly pg: PgClientService,
    private readonly tenants: TenantRepository,
  ) {}

  async get(tenantId: string): Promise<TenantBrandingEntity> {
    const row = await this.pg.queryOne(
      `${BRANDING_SELECT} WHERE tenant_id = ?`,
      [tenantId],
    );
    if (row) {
      return mapTenantBrandingRow(row);
    }
    const tenant = await this.tenants.findById(tenantId);
    return this.tenants.ensureDefaultBranding(
      tenantId,
      tenant?.name ?? 'Tu negocio',
    );
  }

  async update(
    tenantId: string,
    patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>>,
  ): Promise<TenantBrandingEntity> {
    const current = await this.get(tenantId);
    const strOrNull = (
      v: string | null | undefined,
      cur: string | null,
    ): string | null => {
      if (v === undefined) {
        return cur;
      }
      if (v === null) {
        return null;
      }
      const t = String(v).trim();
      return t.length ? t : null;
    };
    const next: TenantBrandingEntity = {
      ...current,
      ...patch,
      tenantId,
      logoUrl:
        patch.logoUrl === undefined
          ? current.logoUrl
          : patch.logoUrl === ''
            ? null
            : patch.logoUrl,
      publicAddress: strOrNull(patch.publicAddress, current.publicAddress),
      publicMapsUrl: strOrNull(patch.publicMapsUrl, current.publicMapsUrl),
      cancellationPolicy: strOrNull(
        patch.cancellationPolicy,
        current.cancellationPolicy,
      ),
      reminderNotice: strOrNull(patch.reminderNotice, current.reminderNotice),
      whatsappPhoneE164:
        patch.whatsappPhoneE164 === undefined
          ? current.whatsappPhoneE164
          : (() => {
              const raw = patch.whatsappPhoneE164;
              if (raw === null || raw === '') {
                return null;
              }
              const digits = String(raw).replace(/\D/g, '');
              return digits.length ? digits : null;
            })(),
      whatsappDefaultMessage: strOrNull(
        patch.whatsappDefaultMessage,
        current.whatsappDefaultMessage,
      ),
      publicBookingHoursJson:
        patch.publicBookingHoursJson === undefined
          ? current.publicBookingHoursJson
          : patch.publicBookingHoursJson === null ||
              String(patch.publicBookingHoursJson).trim() === ''
            ? null
            : String(patch.publicBookingHoursJson).trim(),
      reviewsUrl: strOrNull(patch.reviewsUrl, current.reviewsUrl),
      posPaymentMethodsJson:
        patch.posPaymentMethodsJson === undefined
          ? current.posPaymentMethodsJson
          : (() => {
              const raw = String(patch.posPaymentMethodsJson ?? '').trim();
              if (!raw) {
                return defaultPosPaymentMethodsJson();
              }
              return JSON.stringify(parsePosPaymentMethodsJson(raw));
            })(),
      catalogLayout:
        patch.catalogLayout === 'grid' || patch.catalogLayout === 'horizontal'
          ? patch.catalogLayout
          : current.catalogLayout,
    };
    await this.pg.exec(
      `
        UPDATE tenant_branding
        SET display_name = ?, logo_url = ?, public_address = ?, public_maps_url = ?, cancellation_policy = ?, reminder_notice = ?,
            whatsapp_phone_e164 = ?, whatsapp_default_message = ?, public_booking_hours_json = ?,
            reviews_url = ?, pos_payment_methods_json = ?,
            catalog_layout = ?, primary_color = ?, accent_color = ?, bg_color = ?, surface_color = ?, text_color = ?,
            border_radius_px = ?, use_gradient = ?, gradient_from = ?, gradient_to = ?, gradient_angle_deg = ?
        WHERE tenant_id = ?
      `,
      [
        next.displayName,
        next.logoUrl,
        next.publicAddress,
        next.publicMapsUrl,
        next.cancellationPolicy,
        next.reminderNotice,
        next.whatsappPhoneE164,
        next.whatsappDefaultMessage,
        next.publicBookingHoursJson,
        next.reviewsUrl,
        next.posPaymentMethodsJson,
        next.catalogLayout,
        next.primaryColor,
        next.accentColor,
        next.bgColor,
        next.surfaceColor,
        next.textColor,
        Math.round(next.borderRadiusPx),
        next.useGradient ? true : false,
        next.gradientFrom,
        next.gradientTo,
        Math.round(next.gradientAngleDeg),
        tenantId,
      ],
    );
    return next;
  }
}
