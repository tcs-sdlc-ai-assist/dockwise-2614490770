/**
 * Notification outbox entity: a logged email or SMS delivery.
 *
 * In v1, email and SMS are written to this outbox with a delivery state rather
 * than sent through a live provider; provider keys are env-driven. Delivery
 * never blocks physical processing (for example gate check-in).
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** The outbox message kind. */
export enum OutboxKind {
  EMAIL = 'email',
  SMS = 'sms',
}

/** The delivery state of an outbox message. */
export enum DeliveryState {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notification_outbox')
export class NotificationOutbox {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The message kind. */
  @Index()
  @Column({ type: 'text' })
  kind!: OutboxKind;

  /** The recipient address (email or US mobile number). */
  @Column({ type: 'text' })
  recipient!: string;

  /** The subject/title. */
  @Column({ type: 'text' })
  subject!: string;

  /** The body text. */
  @Column({ type: 'text' })
  body!: string;

  /** The delivery state. */
  @Index()
  @Column({ type: 'text', default: DeliveryState.QUEUED })
  deliveryState!: DeliveryState;

  /** The related appointment/visit id, when applicable. */
  @Column({ type: 'uuid', nullable: true })
  relatedId!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
