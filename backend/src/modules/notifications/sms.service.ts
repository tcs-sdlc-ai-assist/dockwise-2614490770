/**
 * SMS service: writes opt-in US SMS notifications to the outbox.
 *
 * SMS is US-only and opt-in in v1, must not block check-in on delivery
 * failure, and logs delivery state. Delivery is best-effort and never throws
 * into the calling operation.
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
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outbox: Repository<NotificationOutbox>,
  ) {}

  /**
   * Queue an SMS notification.
   *
   * Args:
   *   recipient: The recipient US mobile number.
   *   body: The message text.
   *   relatedId: The related appointment/visit id, when applicable.
   *
   * Returns:
   *   The created outbox record, or null when the write failed (delivery never
   *   blocks the caller).
   */
  async send(
    recipient: string,
    body: string,
    relatedId?: string,
  ): Promise<NotificationOutbox | null> {
    try {
      const record = this.outbox.create({
        kind: OutboxKind.SMS,
        recipient,
        subject: 'SMS',
        body,
        deliveryState: DeliveryState.SENT, // logged as sent in v1 outbox
        relatedId: relatedId ?? null,
      });
      return await this.outbox.save(record);
    } catch (err) {
      // SMS must not block check-in on delivery failure.
      this.logger.warn(
        `SMS outbox write failed for ${recipient}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
