/**
 * Coordinator queue service: the requested/countered queue, confirm/decline/
 * counter actions, door reassignment with reason + history, and the exception
 * list.
 *
 * Confirmations always respect door uniqueness (no double-booking), including
 * after-hours confirmations.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './appointment.enums';
import { Reassignment, ReassignmentReason } from './reassignment.entity';
import { AvailabilityService } from './availability.service';
import { Door, DoorStatus } from '../sites/door.entity';
import { Site } from '../sites/site.entity';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Reassignment)
    private readonly reassignments: Repository<Reassignment>,
    @InjectRepository(Door)
    private readonly doors: Repository<Door>,
    @InjectRepository(Site)
    private readonly sites: Repository<Site>,
    private readonly availability: AvailabilityService,
  ) {}

  /**
   * List the coordinator queue: requested and countered appointments.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Requested and countered appointments ordered by window start.
   */
  async queue(siteId: string): Promise<Appointment[]> {
    return this.appointments
      .createQueryBuilder('a')
      .where('a.siteId = :siteId', { siteId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AppointmentStatus.REQUESTED, AppointmentStatus.COUNTERED],
      })
      .orderBy('a.windowStart', 'ASC')
      .getMany();
  }

  /**
   * Confirm a requested/countered appointment, respecting door uniqueness.
   *
   * Args:
   *   id: The appointment id.
   *
   * Returns:
   *   The confirmed appointment.
   *
   * Raises:
   *   NotFoundException: When the appointment does not exist.
   *   ConflictException: When confirming would double-book the door.
   */
  async confirm(id: string): Promise<Appointment> {
    const appointment = await this.findOrFail(id);
    if (appointment.doorId) {
      const site = await this.sites.findOne({
        where: { id: appointment.siteId },
      });
      const free = await this.availability.isIntervalFree(
        appointment.doorId,
        appointment.windowStart,
        appointment.windowEnd,
        site?.doorBufferMinutes ?? 10,
        appointment.id,
      );
      if (!free) {
        throw new ConflictException(
          'Confirming would double-book the door',
        );
      }
    }
    appointment.status = AppointmentStatus.CONFIRMED;
    return this.appointments.save(appointment);
  }

  /**
   * Decline an appointment with a reason (sets status cancelled).
   *
   * Args:
   *   id: The appointment id.
   *   reason: The decline reason.
   *
   * Returns:
   *   The cancelled appointment.
   */
  async decline(id: string, reason: string): Promise<Appointment> {
    const appointment = await this.findOrFail(id);
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.statusReason = reason;
    return this.appointments.save(appointment);
  }

  /**
   * Counter an appointment with a proposed new window.
   *
   * Args:
   *   id: The appointment id.
   *   windowStart: The proposed window start.
   *   windowEnd: The proposed window end.
   *
   * Returns:
   *   The countered appointment.
   */
  async counter(
    id: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Appointment> {
    const appointment = await this.findOrFail(id);
    appointment.windowStart = windowStart;
    appointment.windowEnd = windowEnd;
    appointment.status = AppointmentStatus.COUNTERED;
    return this.appointments.save(appointment);
  }

  /**
   * Reassign an appointment to a different door with a required reason.
   *
   * Records the old and new door in the reassignment history. The new door
   * must be conflict-free for the appointment's window.
   *
   * Args:
   *   id: The appointment id.
   *   toDoorId: The target door id.
   *   reason: The reassignment reason.
   *   actorUserId: The coordinator making the change.
   *
   * Returns:
   *   The updated appointment.
   *
   * Raises:
   *   NotFoundException: When the appointment or door does not exist.
   *   ConflictException: When the target door conflicts.
   */
  async reassign(
    id: string,
    toDoorId: string,
    reason: ReassignmentReason,
    actorUserId: string,
  ): Promise<Appointment> {
    const appointment = await this.findOrFail(id);
    const toDoor = await this.doors.findOne({ where: { id: toDoorId } });
    if (!toDoor || toDoor.siteId !== appointment.siteId) {
      throw new NotFoundException('Target door not found at this site');
    }
    const site = await this.sites.findOne({
      where: { id: appointment.siteId },
    });
    const free = await this.availability.isIntervalFree(
      toDoorId,
      appointment.windowStart,
      appointment.windowEnd,
      site?.doorBufferMinutes ?? 10,
      appointment.id,
    );
    if (!free) {
      throw new ConflictException('The target door conflicts for this window');
    }

    await this.reassignments.save(
      this.reassignments.create({
        appointmentId: appointment.id,
        fromDoorId: appointment.doorId,
        toDoorId,
        reason,
        actorUserId,
      }),
    );
    appointment.doorId = toDoorId;
    return this.appointments.save(appointment);
  }

  /**
   * List the reassignment history for an appointment.
   *
   * Args:
   *   appointmentId: The appointment id.
   *
   * Returns:
   *   Reassignments ordered by creation time.
   */
  async reassignmentHistory(appointmentId: string): Promise<Reassignment[]> {
    return this.reassignments.find({
      where: { appointmentId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * List exceptions for a site: appointments needing coordinator attention.
   *
   * Includes confirmed appointments on out-of-service doors and appointments
   * past their window end that never arrived.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Appointments surfaced as exceptions.
   */
  async exceptions(siteId: string): Promise<Appointment[]> {
    const outOfServiceDoors = await this.doors.find({
      where: { siteId, status: DoorStatus.OUT_OF_SERVICE },
    });
    const outOfServiceDoorIds = outOfServiceDoors.map((d) => d.id);

    const now = new Date();
    const confirmed = await this.appointments
      .createQueryBuilder('a')
      .where('a.siteId = :siteId', { siteId })
      .andWhere('a.status = :status', { status: AppointmentStatus.CONFIRMED })
      .getMany();

    return confirmed.filter((a) => {
      const onOutOfServiceDoor =
        a.doorId !== null && outOfServiceDoorIds.includes(a.doorId);
      // Past window end + 15 minutes and never arrived.
      const overdueNoArrival =
        now.getTime() > a.windowEnd.getTime() + 15 * 60 * 1000;
      return onOutOfServiceDoor || overdueNoArrival;
    });
  }

  /**
   * Find an appointment or throw.
   *
   * Raises:
   *   NotFoundException: When the appointment does not exist.
   */
  private async findOrFail(id: string): Promise<Appointment> {
    const appointment = await this.appointments.findOne({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }
}
