/**
 * Visit event entity: an immutable timestamped event in a visit's lifecycle.
 *
 * Every state change (check-in, door ready, load start, load complete,
 * check-out, turn-away) appends an event so the visit has a complete audit
 * trail.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('visit_events')
export class VisitEvent {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The visit this event belongs to. */
  @Index()
  @Column({ type: 'uuid' })
  visitId!: string;

  /** The event type (e.g. "checked_in", "door_ready", "load_start"). */
  @Column({ type: 'text' })
  type!: string;

  /** The wall-clock time the event occurred (UTC). */
  @Column({ type: 'datetime' })
  occurredAt!: Date;

  /** The user id of the actor, when known. */
  @Column({ type: 'uuid', nullable: true })
  actorUserId!: string | null;

  /** Optional free-text detail (e.g. a reason). */
  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
