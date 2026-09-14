/**
 * Impersonation controller: start a time-limited impersonation session.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { ImpersonationService } from './impersonation.service';
import { AuthPrincipal } from './auth.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../organizations/membership.entity';

/** Request body for starting impersonation. */
export class StartImpersonationDto {
  /** The user id to impersonate. */
  @IsUUID()
  targetUserId!: string;
}

@Controller('v1/impersonation')
export class ImpersonationController {
  constructor(private readonly impersonation: ImpersonationService) {}

  /**
   * Start an impersonation session (platform admin only).
   *
   * Args:
   *   dto: The target user.
   *   principal: The authenticated platform admin.
   *
   * Returns:
   *   An impersonation access token and the impersonated principal.
   */
  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  start(
    @Body() dto: StartImpersonationDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ accessToken: string; user: AuthPrincipal }> {
    return this.impersonation.start(dto.targetUserId, principal);
  }
}
