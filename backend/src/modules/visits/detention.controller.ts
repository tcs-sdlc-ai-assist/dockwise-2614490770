/**
 * Detention controller: the display-only detention estimate and pause
 * endpoints.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { DetentionService, DetentionEstimate } from './detention.service';
import { DetentionPause } from './detention-pause.entity';
import { PauseDetentionDto } from './dto/pause-detention.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../organizations/membership.entity';
import { AuthPrincipal } from '../auth/auth.service';

@Controller('v1/visits')
export class DetentionController {
  constructor(private readonly detention: DetentionService) {}

  /**
   * Get the detention estimate for a visit.
   *
   * Args:
   *   id: The visit id.
   *   freeTimeMinutes: Optional free-time override (default 120).
   *
   * Returns:
   *   The detention estimate with the display-only disclaimer.
   */
  @Get(':id/detention')
  estimate(
    @Param('id') id: string,
    @Query('freeTimeMinutes') freeTimeMinutes?: string,
  ): Promise<DetentionEstimate> {
    const freeTime = freeTimeMinutes ? parseInt(freeTimeMinutes, 10) : 120;
    return this.detention.estimate(id, freeTime);
  }

  /**
   * Pause the detention clock for a visit (coordinator only).
   *
   * Args:
   *   id: The visit id.
   *   dto: The pause details.
   *   principal: The authenticated coordinator.
   *
   * Returns:
   *   The created pause.
   */
  @Post(':id/detention/pause')
  @Roles(Role.SITE_COORDINATOR, Role.SITE_ADMIN, Role.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  pause(
    @Param('id') id: string,
    @Body() dto: PauseDetentionDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<DetentionPause> {
    return this.detention.pause(
      id,
      dto.reason,
      dto.detail ?? null,
      new Date(dto.startAt),
      new Date(dto.endAt),
      principal,
    );
  }

  /**
   * List detention pauses for a visit.
   *
   * Args:
   *   id: The visit id.
   *
   * Returns:
   *   The pauses ordered by start time.
   */
  @Get(':id/detention/pauses')
  pauses(@Param('id') id: string): Promise<DetentionPause[]> {
    return this.detention.listPauses(id);
  }
}
