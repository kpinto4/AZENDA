import { Injectable, Logger } from '@nestjs/common';

/** Payload mínimo tras crear una reserva pública (Fase 4). */
export interface BookingCreatedPayload {
  tenantSlug: string;
  tenantName: string;
  appointmentId: string;
  customer: string;
  service: string;
  when: string;
  customerPhoneE164: string | null;
}

/**
 * Canal de confirmación al cliente/negocio.
 * Sin SMTP configurado: solo log (piloto / dev). Con `BOOKING_NOTIFY_EMAIL`: registro explícito
 * para copia operativa; integración SMTP completa cuando haya proveedor.
 */
@Injectable()
export class BookingNotificationService {
  private readonly logger = new Logger(BookingNotificationService.name);

  async onBookingCreated(payload: BookingCreatedPayload): Promise<void> {
    const notifyTo = process.env.BOOKING_NOTIFY_EMAIL?.trim();
    const line = `Reserva ${payload.appointmentId} · ${payload.tenantName} (${payload.tenantSlug}) · ${payload.customer} · ${payload.when} · ${payload.service}`;
    if (!notifyTo) {
      this.logger.log(line);
      return;
    }
    this.logger.log(
      `${line} · notificación operativa → ${notifyTo} (SMTP transaccional pendiente de proveedor)`,
    );
  }
}
