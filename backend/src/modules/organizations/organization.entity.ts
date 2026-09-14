/**
 * Organization entity: a property-operator, tenant, or carrier/3PL company.
 *
 * A site belongs to the property operator; tenants are contracted to sites;
 * carriers are invited by tenants or added to a site-level approved list.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** The kind of organization in the Dockwise access model. */
export enum OrganizationType {
  PROPERTY_OPERATOR = 'property_operator',
  TENANT = 'tenant',
  CARRIER = 'carrier',
}

@Entity('organizations')
export class Organization {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Legal or display name of the organization. */
  @Column({ type: 'text' })
  name!: string;

  /** The organization category driving authorization behavior. */
  @Index()
  @Column({ type: 'text' })
  type!: OrganizationType;

  /** Primary contact email for invites and notices. */
  @Column({ type: 'text', nullable: true })
  contactEmail!: string | null;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  /** Last-update timestamp (UTC). */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
