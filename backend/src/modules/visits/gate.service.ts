/**
 * Gate service: check-in, check-out, unscheduled visits, and turn-away.
 *
 * Creates the timestamped physical-event record. Check-in captures the
 * required plate and trailer even when absent from the booking. Check-out
 * matches the in-yard visit and warns when the dock has not marked complete.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit, VisitStatus } from './visit.entity';
import { VisitEvent } from './visit-event.entity';
import {
  UnscheduledVisit,
  UnscheduledStatus,
} from './unscheduled-visit.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { UnscheduledDto } from './dto/unscheduled.dto';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus } from '../appointments/appointment.enums';

@Injectable()
export class GateService {
  constructor(
    @InjectRepository(Visit)
    private readonly visits: Repository<Visit>,
    @InjectRepository(VisitEvent)
    private readonly events: Repository<VisitEvent>,
    @InjectRepository(UnscheduledVisit)
    private readonly unscheduled: Repository<UnscheduledVisit>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  /**
   * Record a visit lifecycle event.
   *
   * Args:
   *   visitId: The visit id.
   *   type: The event type.
   *   actorUserId: The acting user, when known.
   *   detail: Optional free-text detail.
   *   occurredAt: The wall-clock time (defaults to now).
   */
  private async recordEvent(
    visitId: string,
    type: string,
    actorUserId: string | null,
    detail: string | null,
    occurredAt: Date = new Date(),
  ): Promise<void> {
    await this.events.save(
      this.events.create({ visitId, type, actorUserId, detail, occurredAt }),
    );
  }

  /**
   * Check a vehicle in for an appointment, creating the visit.
   *
   * Args:
   *   appointmentId: The appointment being checked in.
   *   dto: The check-in details (driver, plate, trailer).
   *   actorUserId: The gate officer's user id.
   *
   * Returns:
   *   The created visit.
   *
   * Raises:
   *   NotFoundException: When the appointment does not exist.
   *   ConflictException: When the appointment already has an active visit.
   */
  async checkIn(
    appointmentId: string,
    dto: CheckInDto,
    actorUserId: string,
  ): Promise<Visit> {
    const appointment = await this.appointments.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    const existing = await this.visits.findOne({
      where: { appointmentId },
    });
    if (existing && existing.status !== VisitStatus.EXITED) {
      throw new ConflictException(
        'This appointment already has an active visit',
      );
    }

    const now = new Date();
    const visit = await this.visits.save(
      this.visits.create({
        siteId: appointment.siteId,
        appointmentId: appointment.id,
        tenantId: appointment.tenantId,
        carrierName: dto.note ?? appointment.carrierName,
        driverName: dto.driverName,
        tractorPlate: dto.tractorPlate,
        trailerNumber: dto.trailerNumber,
        doorId: appointment.doorId,
        status: VisitStatus.ARRIVED,
        arrivedAt: now,
      }),
    );
    await this.recordEvent(visit.id, 'checked_in', actorUserId, null, now);

    // Advance the appointment to arrived.
    appointment.status = AppointmentStatus.ARRIVED;
    appointment.tractorPlate = dto.tractorPlate;
    appointment.trailerNumber = dto.trailerNumber;
    await this.appointments.save(appointment);

    return visit;
  }

  /**
   * Record an after-the-fact check-in for outage recovery (coordinator-only).
   *
   * Requires a reason and the original wall-clock arrival time.
   *
   * Args:
   *   appointmentId: The appointment being checked in.
   *   dto: The check-in details.
   *   reason: The reason for the after-the-fact entry.
   *   originalArrivedAt: The original wall-clock arrival time.
   *   actorUserId: The coordinator's user id.
   *
   * Returns:
   *   The created visit.
   */
  async afterTheFactCheckIn(
    appointmentId: string,
    dto: CheckInDto,
    reason: string,
    originalArrivedAt: Date,
    actorUserId: string,
  ): Promise<Visit> {
    const appointment = await this.appointments.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    const visit = await this.visits.save(
      this.visits.create({
        siteId: appointment.siteId,
        appointmentId: appointment.id,
        tenantId: appointment.tenantId,
        carrierName: appointment.carrierName,
        driverName: dto.driverName,
        tractorPlate: dto.tractorPlate,
        trailerNumber: dto.trailerNumber,
        doorId: appointment.doorId,
        status: VisitStatus.ARRIVED,
        arrivedAt: originalArrivedAt,
        reason,
      }),
    );
    await this.recordEvent(
      visit.id,
      'after_the_fact_check_in',
      actorUserId,
      reason,
      originalArrivedAt,
    );
    return visit;
  }

  /**
   * Check a vehicle out, setting the visit to exited.
   *
   * Matches the in-yard visit. When the dock has not marked load complete, the
   * checkout is allowed but tagged gate_closed_without_dock.
   *
   * Args:
   *   visitId: The visit id.
   *   dto: The checkout details (seal, load state).
   *   actorUserId: The gate officer's user id.
   *
   * Returns:
   *   The updated visit.
   *
   * Raises:
   *   NotFoundException: When the visit does not exist.
   *   ConflictException: When the visit is already exited.
   */
  async checkOut(
    visitId: string,
    dto: CheckOutDto,
    actorUserId: string,
  ): Promise<Visit> {
    const visit = await this.visits.findOne({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }
    if (visit.status === VisitStatus.EXITED) {
      throw new ConflictException('This visit is already exited');
    }

    const now = new Date();
    if (!visit.loadCompleteAt) {
      visit.gateClosedWithoutDock = true;
    }
    visit.status = VisitStatus.EXITED;
    visit.exitedAt = now;
    visit.outboundSeal = dto.outboundSeal ?? null;
    visit.outboundLoadState = dto.outboundLoadState ?? null;
    const saved = await this.visits.save(visit);
    await this.recordEvent(visitId, 'checked_out', actorUserId, null, now);

    if (visit.appointmentId) {
      await this.appointments.update(
        { id: visit.appointmentId },
        { status: AppointmentStatus.EXITED },
      );
    }
    return saved;
  }

  /**
   * Log an unscheduled visit.
   *
   * Args:
   *   dto: The unscheduled visit details.
   *   actorUserId: The gate officer's user id.
   *
   * Returns:
   *   The created unscheduled visit (placed in Exceptions with no door).
   */
  async logUnscheduled(
    dto: UnscheduledDto,
    actorUserId: string,
  ): Promise<UnscheduledVisit> {
    const now = new Date();
    const record = await this.unscheduled.save(
      this.unscheduled.create({
        siteId: dto.siteId,
        tenantId: dto.tenantId ?? null,
        unknownTenant: dto.unknownTenant ?? false,
        carrierName: dto.carrierName ?? null,
        tractorPlate: dto.tractorPlate,
        trailerNumber: dto.trailerNumber ?? null,
        driverName: dto.driverName ?? null,
        reason: dto.reason,
        status: UnscheduledStatus.PENDING,
        arrivedAt: now,
      }),
    );
    return record;
  }

  /**
   * Turn away an unscheduled visit, retaining the record for search.
   *
   * Args:
   *   id: The unscheduled visit id.
   *   actorUserId: The coordinator's user id.
   *
   * Returns:
   *   The updated unscheduled visit.
   *
   * Raises:
   *   NotFoundException: When the unscheduled visit does not exist.
   */
  async turnAway(id: string, actorUserId: string): Promise<UnscheduledVisit> {
    const record = await this.unscheduled.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Unscheduled visit not found');
    }
    record.status = UnscheduledStatus.TURNED_AWAY;
    return this.unscheduled.save(record);
  }

  /**
   * List unscheduled visits for a site (including turned-away records).
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Unscheduled visits ordered by arrival.
   */
  async listUnscheduled(siteId: string): Promise<UnscheduledVisit[]> {
    return this.unscheduled.find({
      where: { siteId },
      order: { arrivedAt: 'DESC' },
    });
  }
}
