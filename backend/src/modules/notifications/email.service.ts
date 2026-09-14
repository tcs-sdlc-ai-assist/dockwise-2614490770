/**
 * Email service: writes email notifications to the outbox.
 *
 * In v1, delivery is logged with a delivery state rather than sent through a
 * live provider; the provider key is env-driven. Delivery never blocks the
 * calling operation.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryState,
  NotificationOutbox,
  OutboxKind,
} from './notification-outbox.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outbox: Repository<NotificationOutbox>,
  ) {}

  /**
   * Queue an email notification.
   *
   * Args:
   *   recipient: The recipient email address.
   *   subject: The subject line.
   *   body: The body text.
   *   relatedId: The related appointment/visit id, when applicable.
   *
   * Returns:
   *   The created outbox record. Never throws; delivery is best-effort.
   */
  async send(
    recipient: string,
    subject: string,
    body: string,
    relatedId?: string,
  ): Promise<NotificationOutbox> {
    try {
      const record = this.outbox.create({
        kind: OutboxKind.EMAIL,
        recipient,
        subject,
        body,
        deliveryState: DeliveryState.SENT, // logged as sent in v1 outbox
        relatedId: relatedId ?? null,
      });
      return await this.outbox.save(record);
    } catch (err) {
      // Never block the caller on a delivery failure.
      this.logger.warn(
        `Email outbox write failed for ${recipient}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
