import { BookingNotificationService } from './booking-notification.service';

describe('BookingNotificationService', () => {
  const originalEnv = process.env.BOOKING_NOTIFY_EMAIL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BOOKING_NOTIFY_EMAIL;
    } else {
      process.env.BOOKING_NOTIFY_EMAIL = originalEnv;
    }
  });

  it('onBookingCreated no lanza sin BOOKING_NOTIFY_EMAIL', async () => {
    delete process.env.BOOKING_NOTIFY_EMAIL;
    const svc = new BookingNotificationService();
    await expect(
      svc.onBookingCreated({
        tenantSlug: 'spa',
        tenantName: 'Spa',
        appointmentId: 'appt_1',
        customer: 'Ana',
        service: 'Masaje',
        when: '2026-06-01 10:00',
        customerPhoneE164: null,
      }),
    ).resolves.toBeUndefined();
  });
});
