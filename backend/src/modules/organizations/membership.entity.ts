/**
 * Membership entity: joins a user to an organization with a role.
 *
 * Enables one person to belong to more than one organization (for example a
 * 3PL dispatcher serving two tenants) while prohibiting shared logins.
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
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../users/user.entity';

/** The role a user holds within an organization. */
export enum Role {
  PLATFORM_ADMIN = 'platform_admin',
  SITE_ADMIN = 'site_admin',
  SITE_COORDINATOR = 'site_coordinator',
  GATE_OFFICER = 'gate_officer',
  DOCK_LEAD = 'dock_lead',
  TENANT_ADMIN = 'tenant_admin',
  TENANT_BOOKER = 'tenant_booker',
  CARRIER_DISPATCHER = 'carrier_dispatcher',
  AUDITOR = 'auditor',
}

@Entity('memberships')
@Unique(['userId', 'organizationId', 'role'])
export class Membership {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The member user. */
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** The organization the user belongs to. */
  @Index()
  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  /** The role held within that organization. */
  @Index()
  @Column({ type: 'text' })
  role!: Role;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
