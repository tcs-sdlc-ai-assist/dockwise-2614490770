/**
 * Visits controller: gate search, check-in/out, dock events, unscheduled
 * visits, and after-the-fact check-in.
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
import { IsDateString, IsString } from 'class-validator';
import { VisitsService, VisitSearchResult } from './visits.service';
import { GateService } from './gate.service';
import { DockService } from './dock.service';
import { Visit } from './visit.entity';
import { UnscheduledVisit } from './unscheduled-visit.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { UnscheduledDto } from './dto/unscheduled.dto';
import { DockEventDto } from './dto/dock-event.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../organizations/membership.entity';
import { AuthPrincipal } from '../auth/auth.service';

/** Request body for an after-the-fact check-in. */
export class AfterTheFactDto extends CheckInDto {
  /** The reason for the after-the-fact entry. */
  @IsString()
  reason!: string;

  /** The original wall-clock arrival time (ISO 8601, UTC). */
  @IsDateString()
  originalArrivedAt!: string;
}

@Controller('v1/visits')
export class VisitsController {
  constructor(
    private readonly visits: VisitsService,
    private readonly gate: GateService,
    private readonly dock: DockService,
  ) {}

  /**
   * Search appointments/visits by confirmation number, plate, trailer, PO, or
   * tenant name.
   *
   * Args:
   *   siteId: The site id.
   *   q: The search term.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   Matching appointments with any linked visit id.
   */
  @Get('search')
  search(
    @Query('siteId') siteId: string,
    @Query('q') q: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<VisitSearchResult[]> {
    return this.visits.search(siteId, q, principal);
  }

  /**
   * Check a vehicle in for an appointment (gate).
   *
   * Args:
   *   appointmentId: The appointment id.
   *   dto: The check-in details.
   *   principal: The authenticated gate officer.
   *
   * Returns:
   *   The created visit.
   */
  @Post('appointments/:appointmentId/check-in')
  @Roles(Role.GATE_OFFICER, Role.SITE_COORDINATOR, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  checkIn(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CheckInDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Visit> {
    return this.gate.checkIn(appointmentId, dto, principal.userId);
  }

  /**
   * Record an after-the-fact check-in for outage recovery (coordinator-only).
   *
   * Args:
   *   appointmentId: The appointment id.
   *   dto: The check-in details with reason and original arrival time.
   *   principal: The authenticated coordinator.
   *
   * Returns:
   *   The created visit.
   */
  @Post('appointments/:appointmentId/after-the-fact-check-in')
  @Roles(Role.SITE_COORDINATOR, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  afterTheFact(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: AfterTheFactDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Visit> {
    return this.gate.afterTheFactCheckIn(
      appointmentId,
      dto,
      dto.reason,
      new Date(dto.originalArrivedAt),
      principal.userId,
    );
  }

  /**
   * Check a vehicle out (gate).
   *
   * Args:
   *   visitId: The visit id.
   *   dto: The checkout details.
   *   principal: The authenticated gate officer.
   *
   * Returns:
   *   The updated visit.
   */
  @Post(':visitId/check-out')
  @Roles(Role.GATE_OFFICER, Role.SITE_COORDINATOR, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.OK)
  checkOut(
    @Param('visitId') visitId: string,
    @Body() dto: CheckOutDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Visit> {
    return this.gate.checkOut(visitId, dto, principal.userId);
  }

  /**
   * Record a dock status event (dock lead).
   *
   * Args:
   *   dto: The dock event.
   *   principal: The authenticated dock lead.
   *
   * Returns:
   *   The updated visit.
   */
  @Post('dock-event')
  @Roles(Role.DOCK_LEAD, Role.SITE_COORDINATOR, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.OK)
  dockEvent(
    @Body() dto: DockEventDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Visit> {
    return this.dock.recordDockEvent(dto.visitId, dto.type, principal.userId);
  }

  /**
   * Log an unscheduled visit (gate).
   *
   * Args:
   *   dto: The unscheduled visit details.
   *   principal: The authenticated gate officer.
   *
   * Returns:
   *   The created unscheduled visit.
   */
  @Post('unscheduled')
  @Roles(Role.GATE_OFFICER, Role.SITE_COORDINATOR, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  logUnscheduled(
    @Body() dto: UnscheduledDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<UnscheduledVisit> {
    return this.gate.logUnscheduled(dto, principal.userId);
  }

  /**
   * Turn away an unscheduled visit (coordinator).
   *
   * Args:
   *   id: The unscheduled visit id.
   *   principal: The authenticated coordinator.
   *
   * Returns:
   *   The updated unscheduled visit.
   */
  @Post('unscheduled/:id/turn-away')
  @Roles(Role.SITE_COORDINATOR, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.OK)
  turnAway(
    @Param('id') id: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<UnscheduledVisit> {
    return this.gate.turnAway(id, principal.userId);
  }

  /**
   * List unscheduled visits for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Unscheduled visits including turned-away records.
   */
  @Get('unscheduled')
  listUnscheduled(@Query('siteId') siteId: string): Promise<UnscheduledVisit[]> {
    return this.gate.listUnscheduled(siteId);
  }

  /**
   * Get a visit by id.
   *
   * Args:
   *   id: The visit id.
   *
   * Returns:
   *   The visit.
   */
  @Get(':id')
  get(@Param('id') id: string): Promise<Visit> {
    return this.visits.findById(id);
  }
}
