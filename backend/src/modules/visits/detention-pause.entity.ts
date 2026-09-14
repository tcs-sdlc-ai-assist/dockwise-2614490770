/**
 * Detention pause entity: a coordinator-recorded pause of the detention clock.
 *
 * A pause (for example a site fault such as a door breakdown or no forklift)
 * subtracts its duration from the billable detention minutes. A tenant must
 * not pause its own clock.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** The reason category for a detention pause. */
export enum DetentionPauseReason {
  SITE_FAULT = 'site_fault',
}

@Entity('detention_pauses')
export class DetentionPause {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The visit this pause applies to. */
  @Index()
  @Column({ type: 'uuid' })
  visitId!: string;

  /** The pause reason category. */
  @Column({ type: 'text' })
  reason!: DetentionPauseReason;

  /** Free-text detail about the pause. */
  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  /** Pause start (UTC). */
  @Column({ type: 'datetime' })
  startAt!: Date;

  /** Pause end (UTC). */
  @Column({ type: 'datetime' })
  endAt!: Date;

  /** The user id of the coordinator who recorded the pause. */
  @Column({ type: 'uuid' })
  actorUserId!: string;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
