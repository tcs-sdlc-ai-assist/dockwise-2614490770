/**
 * Reassignment entity: the history of a door reassignment.
 *
 * Records the old and new door and the required reason so the reassignment
 * trail is auditable.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** The allowed reasons for a door reassignment. */
export enum ReassignmentReason {
  PRIOR_OVERRUN = 'prior_overrun',
  DOOR_DOWN = 'door_down',
  TENANT_REQUEST = 'tenant_request',
  EQUIPMENT_MISMATCH = 'equipment_mismatch',
  OTHER = 'other',
}

@Entity('reassignments')
export class Reassignment {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The appointment that was reassigned. */
  @Index()
  @Column({ type: 'uuid' })
  appointmentId!: string;

  /** The previous door, when one was assigned. */
  @Column({ type: 'uuid', nullable: true })
  fromDoorId!: string | null;

  /** The new door. */
  @Column({ type: 'uuid' })
  toDoorId!: string;

  /** The required reason for the reassignment. */
  @Column({ type: 'text' })
  reason!: ReassignmentReason;

  /** The user id of the coordinator who made the reassignment. */
  @Column({ type: 'uuid' })
  actorUserId!: string;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
