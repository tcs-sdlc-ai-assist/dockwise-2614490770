/**
 * Door entity: a physical loading door at a site.
 *
 * Doors are capacity inventory. A door may be leased to a tenant or part of the
 * shared pool, and may be taken out of service with a note.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Site } from './site.entity';

/** Physical door type. */
export enum DoorType {
  DOCK_HIGH = 'dock-high',
  GRADE_LEVEL = 'grade-level',
}

/** Door operational status. */
export enum DoorStatus {
  IN_SERVICE = 'in_service',
  OUT_OF_SERVICE = 'out_of_service',
}

@Entity('doors')
@Unique(['siteId', 'number'])
export class Door {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The site this door belongs to. */
  @Index()
  @Column({ type: 'uuid' })
  siteId!: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site!: Site;

  /** Door number/label (unique within a site). */
  @Column({ type: 'text' })
  number!: string;

  /** Physical door type. */
  @Column({ type: 'text' })
  type!: DoorType;

  /** Door group: "pool" or "leased:{tenant_id}". */
  @Index()
  @Column({ type: 'text', default: 'pool' })
  group!: string;

  /** Whether the door has reefer power. */
  @Column({ type: 'boolean', default: false })
  reeferPower!: boolean;

  /** Whether the door supports containers. */
  @Column({ type: 'boolean', default: false })
  containerSupport!: boolean;

  /** Maximum trailer length in feet, when constrained. */
  @Column({ type: 'integer', nullable: true })
  maxTrailerLengthFt!: number | null;

  /** Operational status. */
  @Index()
  @Column({ type: 'text', default: DoorStatus.IN_SERVICE })
  status!: DoorStatus;

  /** Note recorded when the door is taken out of service. */
  @Column({ type: 'text', nullable: true })
  statusNote!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  /** Last-update timestamp (UTC). */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
