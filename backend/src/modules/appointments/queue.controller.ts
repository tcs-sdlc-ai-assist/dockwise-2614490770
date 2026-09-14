/**
 * Coordinator queue controller: queue listing and confirm/decline/counter/
 * reassign actions plus the exception list.
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
import { QueueService } from './queue.service';
import { Appointment } from './appointment.entity';
import { Reassignment } from './reassignment.entity';
import { CounterDto } from './dto/counter.dto';
import { DeclineDto, ReassignDto } from './dto/reassign.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../organizations/membership.entity';
import { AuthPrincipal } from '../auth/auth.service';

@Controller('v1/queue')
@Roles(Role.SITE_COORDINATOR, Role.SITE_ADMIN, Role.PLATFORM_ADMIN)
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  /**
   * List the requested/countered queue for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Requested and countered appointments.
   */
  @Get()
  list(@Query('siteId') siteId: string): Promise<Appointment[]> {
    return this.queue.queue(siteId);
  }

  /**
   * List exceptions for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Appointments surfaced as exceptions.
   */
  @Get('exceptions')
  exceptions(@Query('siteId') siteId: string): Promise<Appointment[]> {
    return this.queue.exceptions(siteId);
  }

  /**
   * Confirm a requested/countered appointment.
   *
   * Args:
   *   id: The appointment id.
   *
   * Returns:
   *   The confirmed appointment.
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string): Promise<Appointment> {
    return this.queue.confirm(id);
  }

  /**
   * Decline an appointment with a reason.
   *
   * Args:
   *   id: The appointment id.
   *   dto: The decline reason.
   *
   * Returns:
   *   The cancelled appointment.
   */
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(
    @Param('id') id: string,
    @Body() dto: DeclineDto,
  ): Promise<Appointment> {
    return this.queue.decline(id, dto.reason);
  }

  /**
   * Counter an appointment with a proposed window.
   *
   * Args:
   *   id: The appointment id.
   *   dto: The proposed window.
   *
   * Returns:
   *   The countered appointment.
   */
  @Post(':id/counter')
  @HttpCode(HttpStatus.OK)
  counter(
    @Param('id') id: string,
    @Body() dto: CounterDto,
  ): Promise<Appointment> {
    return this.queue.counter(
      id,
      new Date(dto.windowStart),
      new Date(dto.windowEnd),
    );
  }

  /**
   * Reassign an appointment to a different door.
   *
   * Args:
   *   id: The appointment id.
   *   dto: The target door and reason.
   *   principal: The authenticated coordinator.
   *
   * Returns:
   *   The updated appointment.
   */
  @Post(':id/reassign')
  @HttpCode(HttpStatus.OK)
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Appointment> {
    return this.queue.reassign(id, dto.toDoorId, dto.reason, principal.userId);
  }

  /**
   * Get the reassignment history for an appointment.
   *
   * Args:
   *   id: The appointment id.
   *
   * Returns:
   *   The reassignment trail.
   */
  @Get(':id/reassignments')
  history(@Param('id') id: string): Promise<Reassignment[]> {
    return this.queue.reassignmentHistory(id);
  }
}
