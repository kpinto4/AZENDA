"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantBrandingRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_client_service_1 = require("../pg-client.service");
const tenant_branding_row_mapper_1 = require("../tenant-branding-row.mapper");
const tenant_repository_1 = require("./tenant.repository");
const default_pos_payment_methods_1 = require("../../../tenant/default-pos-payment-methods");
const BRANDING_SELECT = `
  SELECT tenant_id, display_name, logo_url, public_address, public_maps_url, cancellation_policy, reminder_notice,
         whatsapp_phone_e164, whatsapp_default_message, public_booking_hours_json, reviews_url, pos_payment_methods_json,
         catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
         border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
  FROM tenant_branding
`;
let TenantBrandingRepository = class TenantBrandingRepository {
    constructor(pg, tenants) {
        this.pg = pg;
        this.tenants = tenants;
    }
    async get(tenantId) {
        const row = await this.pg.queryOne(`${BRANDING_SELECT} WHERE tenant_id = ?`, [
            tenantId,
        ]);
        if (row) {
            return (0, tenant_branding_row_mapper_1.mapTenantBrandingRow)(row);
        }
        const tenant = await this.tenants.findById(tenantId);
        return this.tenants.ensureDefaultBranding(tenantId, tenant?.name ?? 'Tu negocio');
    }
    async update(tenantId, patch) {
        const current = await this.get(tenantId);
        const strOrNull = (v, cur) => {
            if (v === undefined) {
                return cur;
            }
            if (v === null) {
                return null;
            }
            const t = String(v).trim();
            return t.length ? t : null;
        };
        const next = {
            ...current,
            ...patch,
            tenantId,
            logoUrl: patch.logoUrl === undefined
                ? current.logoUrl
                : patch.logoUrl === ''
                    ? null
                    : patch.logoUrl,
            publicAddress: strOrNull(patch.publicAddress, current.publicAddress),
            publicMapsUrl: strOrNull(patch.publicMapsUrl, current.publicMapsUrl),
            cancellationPolicy: strOrNull(patch.cancellationPolicy, current.cancellationPolicy),
            reminderNotice: strOrNull(patch.reminderNotice, current.reminderNotice),
            whatsappPhoneE164: patch.whatsappPhoneE164 === undefined
                ? current.whatsappPhoneE164
                : (() => {
                    const raw = patch.whatsappPhoneE164;
                    if (raw === null || raw === '') {
                        return null;
                    }
                    const digits = String(raw).replace(/\D/g, '');
                    return digits.length ? digits : null;
                })(),
            whatsappDefaultMessage: strOrNull(patch.whatsappDefaultMessage, current.whatsappDefaultMessage),
            publicBookingHoursJson: patch.publicBookingHoursJson === undefined
                ? current.publicBookingHoursJson
                : patch.publicBookingHoursJson === null ||
                    String(patch.publicBookingHoursJson).trim() === ''
                    ? null
                    : String(patch.publicBookingHoursJson).trim(),
            reviewsUrl: strOrNull(patch.reviewsUrl, current.reviewsUrl),
            posPaymentMethodsJson: patch.posPaymentMethodsJson === undefined
                ? current.posPaymentMethodsJson
                : (() => {
                    const raw = String(patch.posPaymentMethodsJson ?? '').trim();
                    if (!raw) {
                        return (0, default_pos_payment_methods_1.defaultPosPaymentMethodsJson)();
                    }
                    return JSON.stringify((0, default_pos_payment_methods_1.parsePosPaymentMethodsJson)(raw));
                })(),
            catalogLayout: patch.catalogLayout === 'grid' || patch.catalogLayout === 'horizontal'
                ? patch.catalogLayout
                : current.catalogLayout,
        };
        await this.pg.exec(`
        UPDATE tenant_branding
        SET display_name = ?, logo_url = ?, public_address = ?, public_maps_url = ?, cancellation_policy = ?, reminder_notice = ?,
            whatsapp_phone_e164 = ?, whatsapp_default_message = ?, public_booking_hours_json = ?,
            reviews_url = ?, pos_payment_methods_json = ?,
            catalog_layout = ?, primary_color = ?, accent_color = ?, bg_color = ?, surface_color = ?, text_color = ?,
            border_radius_px = ?, use_gradient = ?, gradient_from = ?, gradient_to = ?, gradient_angle_deg = ?
        WHERE tenant_id = ?
      `, [
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
        ]);
        return next;
    }
};
exports.TenantBrandingRepository = TenantBrandingRepository;
exports.TenantBrandingRepository = TenantBrandingRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService,
        tenant_repository_1.TenantRepository])
], TenantBrandingRepository);
//# sourceMappingURL=tenant-branding.repository.js.map