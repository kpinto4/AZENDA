import { Module } from '@nestjs/common';
import { PublicBookingService } from './public-booking.service';
import { PublicController } from './public.controller';

@Module({
  controllers: [PublicController],
  providers: [PublicBookingService],
})
export class PublicModule {}
