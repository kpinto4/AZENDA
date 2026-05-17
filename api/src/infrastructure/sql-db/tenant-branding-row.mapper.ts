import { TenantBrandingEntity } from './sql-db.types';

export function mapTenantBrandingRow(
  row: Record<string, unknown>,
): TenantBrandingEntity {
  return {
    tenantId: String(row.tenant_id),
    displayName: String(row.display_name ?? ''),
    logoUrl: row.logo_url == null ? null : String(row.logo_url),
    publicAddress:
      row.public_address == null ? null : String(row.public_address),
    publicMapsUrl:
      row.public_maps_url == null ? null : String(row.public_maps_url),
    cancellationPolicy:
      row.cancellation_policy == null ? null : String(row.cancellation_policy),
    reminderNotice:
      row.reminder_notice == null ? null : String(row.reminder_notice),
    whatsappPhoneE164:
      row.whatsapp_phone_e164 == null ||
      String(row.whatsapp_phone_e164).trim() === ''
        ? null
        : String(row.whatsapp_phone_e164).replace(/\D/g, '') || null,
    whatsappDefaultMessage:
      row.whatsapp_default_message == null
        ? null
        : String(row.whatsapp_default_message),
    publicBookingHoursJson:
      row.public_booking_hours_json == null ||
      String(row.public_booking_hours_json).trim() === ''
        ? null
        : String(row.public_booking_hours_json),
    catalogLayout: row.catalog_layout === 'grid' ? 'grid' : 'horizontal',
    primaryColor: String(row.primary_color),
    accentColor: String(row.accent_color),
    bgColor: String(row.bg_color),
    surfaceColor: String(row.surface_color),
    textColor: String(row.text_color),
    borderRadiusPx: Math.max(
      4,
      Math.min(28, Number(row.border_radius_px) || 12),
    ),
    useGradient: Boolean(row.use_gradient),
    gradientFrom: String(row.gradient_from),
    gradientTo: String(row.gradient_to),
    gradientAngleDeg: Math.max(
      0,
      Math.min(360, Number(row.gradient_angle_deg) || 135),
    ),
  };
}
