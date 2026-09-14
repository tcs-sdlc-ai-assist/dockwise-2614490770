/**
 * Site entity: a Meridian warehouse property.
 *
 * A site belongs to the property operator and is independently operable. Every
 * operational entity carries a site_id so sites 2-14 are configured, not
 * forked. Times are stored in UTC and displayed in the site's local timezone.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Lifecycle status of a site. */
export enum SiteStatus {
  SHADOW = 'shadow',
  LIVE = 'live',
}

@Entity('sites')
export class Site {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Site name (e.g. "Dayton DC-03"). */
  @Column({ type: 'text' })
  name!: string;

  /** Street address. */
  @Column({ type: 'text' })
  address!: string;

  /** IANA timezone (e.g. "America/New_York"). */
  @Column({ type: 'text' })
  timezone!: string;

  /** The property operator organization that owns the site. */
  @Index()
  @Column({ type: 'uuid' })
  operatorId!: string;

  /** Site lifecycle status (shadow -> live). */
  @Index()
  @Column({ type: 'text', default: SiteStatus.SHADOW })
  status!: SiteStatus;

  /** Optional yard holding-spot capacity count. */
  @Column({ type: 'integer', nullable: true })
  yardCapacity!: number | null;

  /** Minimum booking notice in minutes (e.g. 120). */
  @Column({ type: 'integer', default: 120 })
  minBookingNoticeMinutes!: number;

  /** Maximum days ahead a booking may be made (e.g. 21). */
  @Column({ type: 'integer', default: 21 })
  maxDaysAhead!: number;

  /** Per-door buffer in minutes applied around each appointment. */
  @Column({ type: 'integer', default: 10 })
  doorBufferMinutes!: number;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  /** Last-update timestamp (UTC). */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
