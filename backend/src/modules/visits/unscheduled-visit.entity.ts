/**
 * Unscheduled visit entity: a gate arrival with no matching appointment.
 *
 * Created by gate staff with a required reason and placed in Exceptions with
 * no door until a coordinator accepts it (creating a short confirmed slot) or
 * turns it away. Turned-away records are retained for search.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** The required reason for an unscheduled visit. */
export enum UnscheduledReason {
  EARLY_WITHOUT_APPT = 'early_without_appt',
  WRONG_DAY = 'wrong_day',
  HOT_LOAD = 'hot_load',
  OTHER = 'other',
}

/** The resolution status of an unscheduled visit. */
export enum UnscheduledStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  TURNED_AWAY = 'turned_away',
}

@Entity('unscheduled_visits')
export class UnscheduledVisit {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The site this arrival is at. */
  @Index()
  @Column({ type: 'uuid' })
  siteId!: string;

  /** The tenant organization, or null for unknown tenant. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  /** Whether the tenant is unknown (pages the coordinator). */
  @Column({ type: 'boolean', default: false })
  unknownTenant!: boolean;

  /** The carrier name. */
  @Column({ type: 'text', nullable: true })
  carrierName!: string | null;

  /** The tractor plate. */
  @Index()
  @Column({ type: 'text' })
  tractorPlate!: string;

  /** The trailer/container number. */
  @Column({ type: 'text', nullable: true })
  trailerNumber!: string | null;

  /** The driver name. */
  @Column({ type: 'text', nullable: true })
  driverName!: string | null;

  /** The required reason for the unscheduled visit. */
  @Column({ type: 'text' })
  reason!: UnscheduledReason;

  /** The resolution status. */
  @Index()
  @Column({ type: 'text', default: UnscheduledStatus.PENDING })
  status!: UnscheduledStatus;

  /** The visit created when accepted, when applicable. */
  @Column({ type: 'uuid', nullable: true })
  visitId!: string | null;

  /** Arrival timestamp (UTC). */
  @Column({ type: 'datetime' })
  arrivedAt!: Date;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
