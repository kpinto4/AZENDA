import { Module } from '@nestjs/common';
import { BookingNotificationService } from './booking-notification.service';
import { PublicBookingService } from './public-booking.service';
import { PublicController } from './public.controller';

@Module({
  controllers: [PublicController],
  providers: [PublicBookingService, BookingNotificationService],
})
export class PublicModule {}
