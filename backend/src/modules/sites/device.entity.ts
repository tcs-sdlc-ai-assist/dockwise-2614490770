/**
 * Device entity: a registered gate/dock shared device (e.g. a guard-shack iPad).
 *
 * Devices are registered through a one-time device code and can be revoked so a
 * lost iPad can no longer check in.
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

@Entity('devices')
export class Device {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The site this device is registered to. */
  @Index()
  @Column({ type: 'uuid' })
  siteId!: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site!: Site;

  /** Human-readable device label (e.g. "Guard shack iPad 1"). */
  @Column({ type: 'text' })
  label!: string;

  /** One-time registration code (unguessable). */
  @Index({ unique: true })
  @Column({ type: 'text' })
  registrationCode!: string;

  /** Whether the device is currently registered/active. */
  @Index()
  @Column({ type: 'boolean', default: false })
  registered!: boolean;

  /** Whether the device has been revoked (cannot check in). */
  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
