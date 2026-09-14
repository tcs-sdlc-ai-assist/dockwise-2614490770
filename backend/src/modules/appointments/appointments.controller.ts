/**
 * Appointments controller: booking, availability, and lifecycle endpoints.
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
import { AppointmentsService } from './appointments.service';
import { AvailabilityService, AvailabilitySlot } from './availability.service';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthPrincipal } from '../auth/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site } from '../sites/site.entity';
import { NotFoundException } from '@nestjs/common';

@Controller('v1/appointments')
export class AppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly availability: AvailabilityService,
    @InjectRepository(Site)
    private readonly sites: Repository<Site>,
  ) {}

  /**
   * Create an appointment.
   *
   * Args:
   *   dto: The appointment attributes.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The created appointment.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Appointment> {
    return this.appointments.create(dto, principal);
  }

  /**
   * Query available slots for a site on a day.
   *
   * Args:
   *   query: The availability query.
   *
   * Returns:
   *   Available slots across the site's doors.
   */
  @Get('availability')
  async getAvailability(
    @Query() query: QueryAvailabilityDto,
  ): Promise<AvailabilitySlot[]> {
    const site = await this.sites.findOne({ where: { id: query.siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return this.availability.availableSlots(
      site,
      new Date(query.day),
      query.durationMinutes,
      query.vehicleType ?? null,
    );
  }

  /**
   * List appointments visible to the caller.
   *
   * Args:
   *   principal: The authenticated caller.
   *   siteId: Optional site filter.
   *
   * Returns:
   *   Appointments scoped to the caller.
   */
  @Get()
  list(
    @CurrentUser() principal: AuthPrincipal,
    @Query('siteId') siteId?: string,
  ): Promise<Appointment[]> {
    return this.appointments.listForPrincipal(principal, siteId);
  }

  /**
   * Get an appointment by id (tenant-scoped).
   *
   * Args:
   *   id: The appointment id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The appointment.
   */
  @Get(':id')
  get(
    @Param('id') id: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Appointment> {
    return this.appointments.findScoped(id, principal);
  }

  /**
   * Submit a draft appointment.
   *
   * Args:
   *   id: The appointment id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The updated appointment.
   */
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Appointment> {
    return this.appointments.submit(id, principal);
  }

  /**
   * Cancel an appointment.
   *
   * Args:
   *   id: The appointment id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The cancelled appointment.
   */
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Appointment> {
    return this.appointments.cancel(id, principal);
  }
}
