/**
 * Dock service: dock-lead status taps for door ready, load start, and load
 * complete.
 *
 * Each tap records the corresponding timestamp on the visit and appends a
 * lifecycle event.
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
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus } from '../appointments/appointment.enums';

@Injectable()
export class DockService {
  constructor(
    @InjectRepository(Visit)
    private readonly visits: Repository<Visit>,
    @InjectRepository(VisitEvent)
    private readonly events: Repository<VisitEvent>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  /**
   * Record a dock status event on a visit.
   *
   * Args:
   *   visitId: The visit id.
   *   type: The dock event type.
   *   actorUserId: The dock lead's user id.
   *
   * Returns:
   *   The updated visit.
   *
   * Raises:
   *   NotFoundException: When the visit does not exist.
   *   ConflictException: When the event is out of order for the visit state.
   */
  async recordDockEvent(
    visitId: string,
    type: 'door_ready' | 'load_start' | 'load_complete',
    actorUserId: string,
  ): Promise<Visit> {
    const visit = await this.visits.findOne({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }
    const now = new Date();

    if (type === 'door_ready') {
      if (visit.status !== VisitStatus.ARRIVED) {
        throw new ConflictException('Door ready requires an arrived visit');
      }
      visit.doorReadyAt = now;
      visit.status = VisitStatus.AT_DOOR;
      await this.setAppointmentStatus(visit.appointmentId, AppointmentStatus.AT_DOOR);
    } else if (type === 'load_start') {
      if (visit.status !== VisitStatus.AT_DOOR) {
        throw new ConflictException('Load start requires the visit at the door');
      }
      visit.loadStartAt = now;
      visit.status = VisitStatus.IN_PROGRESS;
      await this.setAppointmentStatus(
        visit.appointmentId,
        AppointmentStatus.IN_PROGRESS,
      );
    } else {
      if (visit.status !== VisitStatus.IN_PROGRESS) {
        throw new ConflictException('Load complete requires load in progress');
      }
      visit.loadCompleteAt = now;
      visit.status = VisitStatus.COMPLETE;
      await this.setAppointmentStatus(
        visit.appointmentId,
        AppointmentStatus.COMPLETE,
      );
    }

    const saved = await this.visits.save(visit);
    await this.events.save(
      this.events.create({ visitId, type, actorUserId, occurredAt: now }),
    );
    return saved;
  }

  /**
   * Update the linked appointment's status when present.
   *
   * Args:
   *   appointmentId: The appointment id, when linked.
   *   status: The new appointment status.
   */
  private async setAppointmentStatus(
    appointmentId: string | null,
    status: AppointmentStatus,
  ): Promise<void> {
    if (appointmentId) {
      await this.appointments.update({ id: appointmentId }, { status });
    }
  }
}
