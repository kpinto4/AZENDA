export interface BookingCreatedPayload {
    tenantSlug: string;
    tenantName: string;
    appointmentId: string;
    customer: string;
    service: string;
    when: string;
    customerPhoneE164: string | null;
}
export declare class BookingNotificationService {
    private readonly logger;
    onBookingCreated(payload: BookingCreatedPayload): Promise<void>;
}
