import { NotFoundException } from '@nestjs/common';
import { BookingNotificationService } from './booking-notification.service';
import { PublicBookingService } from './public-booking.service';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';

describe('PublicBookingService', () => {
  it('getPublicMeta rechaza slug inexistente', async () => {
    const sqlDb = {
      findTenantBySlug: jest.fn().mockResolvedValue(undefined),
    } as unknown as SqlDbService;
    const svc = new PublicBookingService(
      sqlDb,
      new BookingNotificationService(),
    );
    await expect(svc.getPublicMeta('no-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
