/**
 * Impersonation service: time-limited platform-admin impersonation for
 * audited support.
 *
 * A platform admin can view as a tenant or site user with a persistent banner,
 * an impersonated_by tag on every write, and a maximum 60-minute session.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuthService, AuthPrincipal } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '../organizations/membership.entity';

/** Maximum impersonation session length in seconds (60 minutes). */
const MAX_IMPERSONATION_SECONDS = 60 * 60;

@Injectable()
export class ImpersonationService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Start an impersonation session for a target user.
   *
   * Args:
   *   targetUserId: The user to impersonate.
   *   principal: The authenticated platform admin.
   *
   * Returns:
   *   An impersonation access token and the impersonated principal.
   *
   * Raises:
   *   ForbiddenException: When the caller is not a platform admin.
   *   NotFoundException: When the target user does not exist.
   */
  async start(
    targetUserId: string,
    principal: AuthPrincipal,
  ): Promise<{ accessToken: string; user: AuthPrincipal }> {
    const isPlatformAdmin = principal.memberships.some(
      (m) => m.role === Role.PLATFORM_ADMIN,
    );
    if (!isPlatformAdmin) {
      throw new ForbiddenException('Only a platform admin may impersonate');
    }
    const target = await this.users.findOne({ where: { id: targetUserId } });
    if (!target || !target.active) {
      throw new NotFoundException('Target user not found');
    }

    const targetPrincipal = await this.auth.principalForUserId(target.id);
    targetPrincipal.impersonatedBy = principal.userId;

    const accessToken = await this.jwt.signAsync(
      {
        sub: target.id,
        email: target.email,
        impersonatedBy: principal.userId,
      },
      { expiresIn: MAX_IMPERSONATION_SECONDS },
    );

    await this.audit.record({
      action: 'impersonation.start',
      entityType: 'user',
      entityId: target.id,
      actorUserId: principal.userId,
      detail: { targetEmail: target.email },
    });

    return { accessToken, user: targetPrincipal };
  }
}
