export declare class UpdateTenantBrandingDto {
    displayName?: string;
    logoUrl?: string | null;
    publicAddress?: string;
    publicMapsUrl?: string;
    cancellationPolicy?: string;
    reminderNotice?: string;
    whatsappPhoneE164?: string | null;
    whatsappDefaultMessage?: string | null;
    publicBookingHoursJson?: string | null;
    reviewsUrl?: string | null;
    posPaymentMethodsJson?: string | null;
    catalogLayout?: 'horizontal' | 'grid';
    primaryColor?: string;
    accentColor?: string;
    bgColor?: string;
    surfaceColor?: string;
    textColor?: string;
    borderRadiusPx?: number;
    useGradient?: boolean;
    gradientFrom?: string;
    gradientTo?: string;
    gradientAngleDeg?: number;
}
