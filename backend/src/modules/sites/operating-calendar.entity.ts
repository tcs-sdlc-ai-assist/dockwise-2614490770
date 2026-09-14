/**
 * Operating calendar entity: a site's hours, holiday closures, and blackouts.
 *
 * Stores default weekday hours plus dated closures and blackout windows (for
 * example a pest-control blackout Wednesday 02:00-04:00). Times are stored as
 * site-local HH:mm strings and interpreted in the site's timezone.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Site } from './site.entity';

/** The kind of calendar entry. */
export enum CalendarEntryType {
  WEEKDAY_HOURS = 'weekday_hours',
  HOLIDAY_CLOSURE = 'holiday_closure',
  BLACKOUT = 'blackout',
}

@Entity('operating_calendar')
export class OperatingCalendarEntry {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The site this entry applies to. */
  @Index()
  @Column({ type: 'uuid' })
  siteId!: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site!: Site;

  /** The entry kind. */
  @Column({ type: 'text' })
  type!: CalendarEntryType;

  /** Day of week (0=Sunday..6=Saturday) for weekday hours / weekly blackouts. */
  @Column({ type: 'integer', nullable: true })
  dayOfWeek!: number | null;

  /** Specific calendar date (YYYY-MM-DD) for holiday closures. */
  @Column({ type: 'text', nullable: true })
  date!: string | null;

  /** Window start (site-local HH:mm); null for all-day closures. */
  @Column({ type: 'text', nullable: true })
  startTime!: string | null;

  /** Window end (site-local HH:mm); null for all-day closures. */
  @Column({ type: 'text', nullable: true })
  endTime!: string | null;

  /** Free-text label (e.g. "Pest control"). */
  @Column({ type: 'text', nullable: true })
  label!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
