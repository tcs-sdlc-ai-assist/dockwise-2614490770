/**
 * Visit entity: the physical-event record for a truck's time on site.
 *
 * A visit is created at gate check-in (or for an unscheduled arrival) and
 * tracks the arrival, door assignment, load start, load complete, and exit
 * timestamps that form the defensible audit trail.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** The lifecycle status of a visit. */
export enum VisitStatus {
  ARRIVED = 'arrived',
  AT_DOOR = 'at_door',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  EXITED = 'exited',
  TURNED_AWAY = 'turned_away',
}

@Entity('visits')
export class Visit {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The site this visit is at. */
  @Index()
  @Column({ type: 'uuid' })
  siteId!: string;

  /** The linked appointment, when the visit has one. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  appointmentId!: string | null;

  /** The tenant organization, when known. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  /** The carrier name or organization. */
  @Column({ type: 'text', nullable: true })
  carrierName!: string | null;

  /** The driver name captured at check-in. */
  @Column({ type: 'text', nullable: true })
  driverName!: string | null;

  /** The tractor plate (required at check-in). */
  @Index()
  @Column({ type: 'text' })
  tractorPlate!: string;

  /** The trailer/container number (required at check-in). */
  @Index()
  @Column({ type: 'text' })
  trailerNumber!: string;

  /** The assigned door, when at the door. */
  @Column({ type: 'uuid', nullable: true })
  doorId!: string | null;

  /** Visit lifecycle status. */
  @Index()
  @Column({ type: 'text', default: VisitStatus.ARRIVED })
  status!: VisitStatus;

  /** Gate check-in (arrival) timestamp. */
  @Column({ type: 'datetime' })
  arrivedAt!: Date;

  /** Door-ready timestamp. */
  @Column({ type: 'datetime', nullable: true })
  doorReadyAt!: Date | null;

  /** Load-start timestamp. */
  @Column({ type: 'datetime', nullable: true })
  loadStartAt!: Date | null;

  /** Load-complete timestamp. */
  @Column({ type: 'datetime', nullable: true })
  loadCompleteAt!: Date | null;

  /** Gate check-out (exit) timestamp. */
  @Column({ type: 'datetime', nullable: true })
  exitedAt!: Date | null;

  /** Optional outbound seal captured at checkout. */
  @Column({ type: 'text', nullable: true })
  outboundSeal!: string | null;

  /** Whether the trailer left empty or loaded (checkout toggle). */
  @Column({ type: 'text', nullable: true })
  outboundLoadState!: string | null;

  /** Set when checkout completed without the dock marking load complete. */
  @Column({ type: 'boolean', default: false })
  gateClosedWithoutDock!: boolean;

  /** Reason recorded for a turn-away or after-the-fact entry. */
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  /** Last-update timestamp (UTC). */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
