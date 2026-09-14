/**
 * Appointments service: booking creation, lifecycle, and tenant scoping.
 *
 * Enforces the core invariants: tenant isolation (a tampered tenant_id returns
 * 403), no double-booking (a confirmed overlapping appointment returns 409),
 * and the auto-confirm rule (in-hours leased-door bookings auto-confirm when
 * free; pool doors and after-hours go to requested).
 */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './appointment.enums';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AvailabilityService } from './availability.service';
import { generateConfirmationCode } from './confirmation-code.util';
import { AuthPrincipal } from '../auth/auth.service';
import { Role } from '../organizations/membership.entity';
import { Door } from '../sites/door.entity';
import { Site } from '../sites/site.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Door)
    private readonly doors: Repository<Door>,
    @InjectRepository(Site)
    private readonly sites: Repository<Site>,
    private readonly availability: AvailabilityService,
  ) {}

  /**
   * Resolve the tenant organization ids the caller belongs to.
   *
   * Args:
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The tenant organization ids the caller is a member of.
   */
  private callerTenantIds(principal: AuthPrincipal): string[] {
    return principal.memberships
      .filter((m) => m.organizationType === 'tenant')
      .map((m) => m.organizationId);
  }

  /**
   * Create an appointment, applying the auto-confirm rule.
   *
   * Args:
   *   dto: The appointment attributes.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The created appointment.
   *
   * Raises:
   *   ForbiddenException: When the caller books for a tenant they do not
   *     belong to.
   *   NotFoundException: When the site or door does not exist.
   *   ConflictException: When the requested slot conflicts with a confirmed
   *     appointment on the same door.
   */
  async create(
    dto: CreateAppointmentDto,
    principal: AuthPrincipal,
  ): Promise<Appointment> {
    // Tenant isolation: a booker may only book for their own tenant.
    const isOperator = principal.memberships.some(
      (m) =>
        m.organizationType === 'property_operator' &&
        (m.role === Role.SITE_ADMIN ||
          m.role === Role.SITE_COORDINATOR ||
          m.role === Role.PLATFORM_ADMIN),
    );
    if (!isOperator) {
      const tenantIds = this.callerTenantIds(principal);
      if (!tenantIds.includes(dto.tenantId)) {
        throw new ForbiddenException(
          'You may only book for your own tenant organization',
        );
      }
    }

    const site = await this.sites.findOne({ where: { id: dto.siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const windowStart = new Date(dto.windowStart);
    const windowEnd = new Date(dto.windowEnd);
    if (windowEnd <= windowStart) {
      throw new ConflictException('windowEnd must be after windowStart');
    }

    let door: Door | null = null;
    if (dto.doorId) {
      door = await this.doors.findOne({ where: { id: dto.doorId } });
      if (!door || door.siteId !== site.id) {
        throw new NotFoundException('Door not found at this site');
      }
    }

    // Determine status: drafts stay drafts; otherwise apply auto-confirm.
    let status = AppointmentStatus.REQUESTED;
    if (dto.saveAsDraft) {
      status = AppointmentStatus.DRAFT;
    } else if (door) {
      const isLeasedToTenant = door.group === `leased:${dto.tenantId}`;
      const inHours = this.availability.isWithinSiteHours(
        site,
        windowStart,
        windowEnd,
      );
      const free = await this.availability.isIntervalFree(
        door.id,
        windowStart,
        windowEnd,
        site.doorBufferMinutes,
      );
      if (!free) {
        throw new ConflictException(
          'The requested slot conflicts with a confirmed appointment on this door',
        );
      }
      // Auto-confirm only in-hours leased-door bookings that are free.
      if (isLeasedToTenant && inHours && !dto.afterHours) {
        status = AppointmentStatus.CONFIRMED;
      }
    }

    const appointment = this.appointments.create({
      confirmationCode: generateConfirmationCode(),
      siteId: site.id,
      tenantId: dto.tenantId,
      carrierId: dto.carrierId ?? null,
      carrierName: dto.carrierName ?? null,
      doorId: door?.id ?? null,
      activity: dto.activity,
      windowStart,
      windowEnd,
      vehicleType: dto.vehicleType ?? null,
      referenceText: dto.referenceText ?? null,
      hazmat: dto.hazmat ?? false,
      afterHours: dto.afterHours ?? false,
      dropTrailer: dto.dropTrailer ?? false,
      gateNote: dto.gateNote ?? null,
      internalNote: dto.internalNote ?? null,
      status,
    });
    return this.appointments.save(appointment);
  }

  /**
   * Submit a draft appointment, applying the auto-confirm rule.
   *
   * Args:
   *   id: The appointment id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The updated appointment.
   */
  async submit(id: string, principal: AuthPrincipal): Promise<Appointment> {
    const appointment = await this.findScoped(id, principal);
    if (appointment.status !== AppointmentStatus.DRAFT) {
      throw new ConflictException('Only a draft can be submitted');
    }
    if (appointment.doorId) {
      const door = await this.doors.findOne({
        where: { id: appointment.doorId },
      });
      const site = await this.sites.findOne({
        where: { id: appointment.siteId },
      });
      if (door && site) {
        const free = await this.availability.isIntervalFree(
          door.id,
          appointment.windowStart,
          appointment.windowEnd,
          site.doorBufferMinutes,
          appointment.id,
        );
        if (!free) {
          throw new ConflictException(
            'The slot now conflicts with a confirmed appointment',
          );
        }
        const isLeasedToTenant =
          door.group === `leased:${appointment.tenantId}`;
        const inHours = this.availability.isWithinSiteHours(
          site,
          appointment.windowStart,
          appointment.windowEnd,
        );
        appointment.status =
          isLeasedToTenant && inHours && !appointment.afterHours
            ? AppointmentStatus.CONFIRMED
            : AppointmentStatus.REQUESTED;
      } else {
        appointment.status = AppointmentStatus.REQUESTED;
      }
    } else {
      appointment.status = AppointmentStatus.REQUESTED;
    }
    return this.appointments.save(appointment);
  }

  /**
   * Find an appointment by id, enforcing tenant scoping.
   *
   * Args:
   *   id: The appointment id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The appointment when the caller may see it.
   *
   * Raises:
   *   NotFoundException: When the appointment does not exist.
   *   ForbiddenException: When the caller may not access the appointment.
   */
  async findScoped(
    id: string,
    principal: AuthPrincipal,
  ): Promise<Appointment> {
    const appointment = await this.appointments.findOne({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    const isOperator = principal.memberships.some(
      (m) => m.organizationType === 'property_operator',
    );
    if (isOperator) {
      return appointment;
    }
    const tenantIds = this.callerTenantIds(principal);
    const carrierIds = principal.memberships
      .filter((m) => m.organizationType === 'carrier')
      .map((m) => m.organizationId);
    const allowed =
      tenantIds.includes(appointment.tenantId) ||
      (appointment.carrierId !== null &&
        carrierIds.includes(appointment.carrierId));
    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }
    return appointment;
  }

  /**
   * List appointments visible to the caller, optionally filtered by site.
   *
   * Args:
   *   principal: The authenticated caller.
   *   siteId: Optional site filter.
   *
   * Returns:
   *   Appointments scoped to the caller's organization.
   */
  async listForPrincipal(
    principal: AuthPrincipal,
    siteId?: string,
  ): Promise<Appointment[]> {
    const isOperator = principal.memberships.some(
      (m) => m.organizationType === 'property_operator',
    );
    const qb = this.appointments
      .createQueryBuilder('a')
      .orderBy('a.windowStart', 'ASC');
    if (siteId) {
      qb.andWhere('a.siteId = :siteId', { siteId });
    }
    if (!isOperator) {
      const tenantIds = this.callerTenantIds(principal);
      const carrierIds = principal.memberships
        .filter((m) => m.organizationType === 'carrier')
        .map((m) => m.organizationId);
      const ids = [...tenantIds, ...carrierIds];
      if (ids.length === 0) {
        return [];
      }
      qb.andWhere('(a.tenantId IN (:...ids) OR a.carrierId IN (:...ids))', {
        ids,
      });
    }
    return qb.getMany();
  }

  /**
   * Cancel an appointment. Free cancellation until 2 hours before the window;
   * inside 2 hours the cancellation is tagged late_cancel.
   *
   * Args:
   *   id: The appointment id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The cancelled appointment.
   */
  async cancel(id: string, principal: AuthPrincipal): Promise<Appointment> {
    const appointment = await this.findScoped(id, principal);
    const now = new Date();
    const twoHoursBefore = new Date(
      appointment.windowStart.getTime() - 2 * 60 * 60 * 1000,
    );
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.statusReason =
      now >= twoHoursBefore ? 'late_cancel' : 'cancelled';
    return this.appointments.save(appointment);
  }
}
