/**
 * Appointment entity: a planned door-time commitment.
 *
 * A confirmed appointment consumes a door interval plus its buffer. Times are
 * stored in UTC. The confirmation code is an unguessable human-readable
 * identifier for UI, radio, and paperwork.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ActivityType,
  AppointmentStatus,
  VehicleType,
} from './appointment.enums';

@Entity('appointments')
export class Appointment {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unguessable human-readable confirmation code. */
  @Index({ unique: true })
  @Column({ type: 'text' })
  confirmationCode!: string;

  /** The site this appointment is at. */
  @Index()
  @Column({ type: 'uuid' })
  siteId!: string;

  /** The tenant organization that owns the appointment. */
  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  /** The carrier organization, when linked. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  carrierId!: string | null;

  /** Free-text carrier name when no carrier account is linked. */
  @Column({ type: 'text', nullable: true })
  carrierName!: string | null;

  /** The assigned door, when known. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  doorId!: string | null;

  /** Direction/activity of the visit. */
  @Column({ type: 'text' })
  activity!: ActivityType;

  /** Window start (UTC). */
  @Index()
  @Column({ type: 'datetime' })
  windowStart!: Date;

  /** Window end (UTC). */
  @Column({ type: 'datetime' })
  windowEnd!: Date;

  /** Vehicle type for door-compatibility checks. */
  @Column({ type: 'text', nullable: true })
  vehicleType!: VehicleType | null;

  /** Optional PO/BOL/container/seal reference text. */
  @Column({ type: 'text', nullable: true })
  referenceText!: string | null;

  /** Hazmat flag. */
  @Column({ type: 'boolean', default: false })
  hazmat!: boolean;

  /** After-hours flag (requires coordinator confirmation). */
  @Column({ type: 'boolean', default: false })
  afterHours!: boolean;

  /** Drop-trailer flag. */
  @Column({ type: 'boolean', default: false })
  dropTrailer!: boolean;

  /** Gate-visible note. */
  @Column({ type: 'text', nullable: true })
  gateNote!: string | null;

  /** Internal-only note (never shown to other tenants). */
  @Column({ type: 'text', nullable: true })
  internalNote!: string | null;

  /** Lifecycle status. */
  @Index()
  @Column({ type: 'text', default: AppointmentStatus.DRAFT })
  status!: AppointmentStatus;

  /** Reason recorded for a decline/cancel/exception. */
  @Column({ type: 'text', nullable: true })
  statusReason!: string | null;

  /** Tractor plate, when known. */
  @Column({ type: 'text', nullable: true })
  tractorPlate!: string | null;

  /** Trailer/container number, when known. */
  @Column({ type: 'text', nullable: true })
  trailerNumber!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  /** Last-update timestamp (UTC). */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
