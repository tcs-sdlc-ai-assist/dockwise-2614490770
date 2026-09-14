/**
 * User entity: a person who signs in to Dockwise.
 *
 * A person may belong to more than one organization via memberships; accounts
 * are never shared. Office users authenticate with email and password; gate and
 * dock users authenticate by PIN in registered shared-device mode.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  /** Primary key. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unique sign-in email. */
  @Index({ unique: true })
  @Column({ type: 'text' })
  email!: string;

  /** bcrypt hash of the account password (never logged). */
  @Column({ type: 'text' })
  passwordHash!: string;

  /** Display name. */
  @Column({ type: 'text' })
  fullName!: string;

  /** Optional US mobile number for opt-in SMS. */
  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  /** Whether the user has opted in to SMS notifications. */
  @Column({ type: 'boolean', default: false })
  smsOptIn!: boolean;

  /** Whether MFA is enabled (required for privileged roles). */
  @Column({ type: 'boolean', default: false })
  mfaEnabled!: boolean;

  /** Whether the account is active; disabling revokes sessions immediately. */
  @Index()
  @Column({ type: 'boolean', default: true })
  active!: boolean;

  /** Creation timestamp (UTC). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  /** Last-update timestamp (UTC). */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
