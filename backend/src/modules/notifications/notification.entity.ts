/**
 * Notification entity: an in-app bell notification for a user.
 *
 * In-app notifications complement email/SMS for appointment lifecycle events.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** The notification channel. */
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
}

@Entity('notifications')
export class Notification {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The recipient user id. */
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  /** The notification channel. */
  @Column({ type: 'text' })
  channel!: NotificationChannel;

  /** Short title. */
  @Column({ type: 'text' })
  title!: string;

  /** Body text. */
  @Column({ type: 'text' })
  body!: string;

  /** Whether the notification has been read (in-app bell). */
  @Index()
  @Column({ type: 'boolean', default: false })
  read!: boolean;

  /** The related appointment/visit id, when applicable. */
  @Column({ type: 'uuid', nullable: true })
  relatedId!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
