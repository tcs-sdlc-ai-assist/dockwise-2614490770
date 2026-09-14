/**
 * Authentication service: credential verification, token issuance, and the
 * authenticated principal.
 *
 * Office users authenticate with email and password; the issued JWT carries the
 * user's memberships so downstream guards can enforce organization and role
 * scope on every request.
 */
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Membership, Role } from '../organizations/membership.entity';
import { config } from '../../config/configuration';

/** A single organization membership carried on the authenticated principal. */
export interface PrincipalMembership {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  role: Role;
}

/** The authenticated principal attached to each authorized request. */
export interface AuthPrincipal {
  userId: string;
  email: string;
  fullName: string;
  memberships: PrincipalMembership[];
  /** Set when a platform admin is impersonating another user for support. */
  impersonatedBy?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Verify an email/password credential pair.
   *
   * Args:
   *   email: The account email.
   *   password: The plaintext password to verify.
   *
   * Returns:
   *   The matching active user.
   *
   * Raises:
   *   UnauthorizedException: When credentials are invalid or the account is
   *     disabled.
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  /**
   * Build the authenticated principal for a user, including memberships.
   *
   * Args:
   *   user: The authenticated user.
   *
   * Returns:
   *   The AuthPrincipal with populated memberships.
   */
  async buildPrincipal(user: User): Promise<AuthPrincipal> {
    const memberships = await this.memberships.find({
      where: { userId: user.id },
      relations: ['organization'],
    });
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      memberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization?.name ?? '',
        organizationType: m.organization?.type ?? '',
        role: m.role,
      })),
    };
  }

  /**
   * Sign an access token for an authenticated principal.
   *
   * Args:
   *   principal: The authenticated principal.
   *
   * Returns:
   *   A signed JWT access token string.
   */
  async signToken(principal: AuthPrincipal): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: principal.userId,
        email: principal.email,
        impersonatedBy: principal.impersonatedBy,
      },
      { expiresIn: config.jwtExpiresIn },
    );
  }

  /**
   * Authenticate with email and password and issue an access token.
   *
   * Args:
   *   email: The account email.
   *   password: The plaintext password.
   *
   * Returns:
   *   An object with the access token and the authenticated principal.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: AuthPrincipal }> {
    const user = await this.validateUser(email, password);
    const principal = await this.buildPrincipal(user);
    const accessToken = await this.signToken(principal);
    return { accessToken, user: principal };
  }

  /**
   * Resolve a principal from a validated JWT payload.
   *
   * Args:
   *   userId: The subject user id from the token.
   *
   * Returns:
   *   The AuthPrincipal for the still-active user.
   *
   * Raises:
   *   UnauthorizedException: When the user no longer exists or is disabled.
   */
  async principalForUserId(userId: string): Promise<AuthPrincipal> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Account disabled');
    }
    return this.buildPrincipal(user);
  }
}
