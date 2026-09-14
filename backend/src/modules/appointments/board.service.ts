/**
 * Live board service: a single-screen operational snapshot for site and gate.
 *
 * Produces the Upcoming (2h), In yard, At door, and Exceptions buckets with
 * per-card tenant, carrier, door, window, status, and minutes-versus-window so
 * the board can color cards (green on-time, amber late, red exception, purple
 * unscheduled).
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './appointment.enums';
import { Door, DoorStatus } from '../sites/door.entity';

/** A single board card. */
export interface BoardCard {
  appointmentId: string;
  confirmationCode: string;
  tenantId: string;
  carrierName: string | null;
  doorId: string | null;
  doorNumber: string | null;
  windowStart: Date;
  windowEnd: Date;
  status: AppointmentStatus;
  /** Minutes versus window start: negative = early, 0 = on time, positive = late. */
  minutesVsWindow: number | null;
  /** Card color: green on-time, amber late, red exception, purple unscheduled. */
  color: 'green' | 'amber' | 'red' | 'purple';
}

/** The board snapshot buckets. */
export interface BoardSnapshot {
  siteId: string;
  generatedAt: Date;
  upcoming: BoardCard[];
  inYard: BoardCard[];
  atDoor: BoardCard[];
  exceptions: BoardCard[];
}

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Door)
    private readonly doors: Repository<Door>,
  ) {}

  /**
   * Build the board snapshot for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   The board snapshot with the four buckets populated.
   */
  async snapshot(siteId: string): Promise<BoardSnapshot> {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const doors = await this.doors.find({ where: { siteId } });
    const doorNumberById = new Map(doors.map((d) => [d.id, d.number]));
    const outOfServiceDoorIds = new Set(
      doors.filter((d) => d.status === DoorStatus.OUT_OF_SERVICE).map((d) => d.id),
    );

    const appointments = await this.appointments
      .createQueryBuilder('a')
      .where('a.siteId = :siteId', { siteId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.ARRIVED,
          AppointmentStatus.AT_DOOR,
          AppointmentStatus.IN_PROGRESS,
          AppointmentStatus.TURNED_AWAY,
        ],
      })
      .orderBy('a.windowStart', 'ASC')
      .getMany();

    const upcoming: BoardCard[] = [];
    const inYard: BoardCard[] = [];
    const atDoor: BoardCard[] = [];
    const exceptions: BoardCard[] = [];

    for (const appt of appointments) {
      const card = this.toCard(appt, doorNumberById, now, outOfServiceDoorIds);
      const isException =
        (appt.doorId !== null && outOfServiceDoorIds.has(appt.doorId)) ||
        (appt.status === AppointmentStatus.CONFIRMED &&
          now.getTime() > appt.windowEnd.getTime() + 15 * 60 * 1000) ||
        appt.status === AppointmentStatus.TURNED_AWAY;

      if (isException) {
        // Turned-away (unscheduled) cards stay purple; other exceptions are red.
        card.color =
          appt.status === AppointmentStatus.TURNED_AWAY ? 'purple' : 'red';
        exceptions.push(card);
        continue;
      }
      if (
        appt.status === AppointmentStatus.AT_DOOR ||
        appt.status === AppointmentStatus.IN_PROGRESS
      ) {
        atDoor.push(card);
      } else if (appt.status === AppointmentStatus.ARRIVED) {
        inYard.push(card);
      } else if (
        appt.status === AppointmentStatus.CONFIRMED &&
        appt.windowStart.getTime() <= twoHoursFromNow.getTime()
      ) {
        upcoming.push(card);
      }
    }

    return {
      siteId,
      generatedAt: now,
      upcoming,
      inYard,
      atDoor,
      exceptions,
    };
  }

  /**
   * Map an appointment to a board card with minutes-versus-window and color.
   *
   * Args:
   *   appt: The appointment.
   *   doorNumberById: A door-id to door-number map.
   *   now: The current instant.
   *   outOfServiceDoorIds: The set of out-of-service door ids.
   *
   * Returns:
   *   The board card.
   */
  private toCard(
    appt: Appointment,
    doorNumberById: Map<string, string>,
    now: Date,
    outOfServiceDoorIds: Set<string>,
  ): BoardCard {
    let minutesVsWindow: number | null = null;
    let color: BoardCard['color'] = 'green';

    if (
      appt.status === AppointmentStatus.ARRIVED ||
      appt.status === AppointmentStatus.AT_DOOR ||
      appt.status === AppointmentStatus.IN_PROGRESS
    ) {
      // Minutes early/late versus window start (negative = early).
      minutesVsWindow = Math.round(
        (now.getTime() - appt.windowStart.getTime()) / 60000,
      );
      color = minutesVsWindow > 15 ? 'amber' : 'green';
    }
    if (appt.status === AppointmentStatus.TURNED_AWAY) {
      color = 'purple';
    }
    if (appt.doorId !== null && outOfServiceDoorIds.has(appt.doorId)) {
      color = 'red';
    }

    return {
      appointmentId: appt.id,
      confirmationCode: appt.confirmationCode,
      tenantId: appt.tenantId,
      carrierName: appt.carrierName,
      doorId: appt.doorId,
      doorNumber: appt.doorId ? doorNumberById.get(appt.doorId) ?? null : null,
      windowStart: appt.windowStart,
      windowEnd: appt.windowEnd,
      status: appt.status,
      minutesVsWindow,
      color,
    };
  }
}
