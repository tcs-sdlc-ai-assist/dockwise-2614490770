/**
 * Audit log entity: an immutable record of a significant action.
 *
 * Records appointment create/update/delete, door configuration, role changes,
 * detention pauses, and impersonation. Records are append-only and never
 * updated or deleted.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The action (e.g. "appointment.create", "door.reassign", "impersonation.start"). */
  @Index()
  @Column({ type: 'text' })
  action!: string;

  /** The entity type acted upon (e.g. "appointment", "door"). */
  @Index()
  @Column({ type: 'text' })
  entityType!: string;

  /** The entity id acted upon, when applicable. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null;

  /** The acting user id. */
  @Index()
  @Column({ type: 'uuid' })
  actorUserId!: string;

  /** Set when the action was performed under impersonation. */
  @Column({ type: 'uuid', nullable: true })
  impersonatedBy!: string | null;

  /** The site the action relates to, when applicable. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  siteId!: string | null;

  /** Structured detail (JSON-serializable diff/context). */
  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  /** Creation timestamp (UTC). Immutable. */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
