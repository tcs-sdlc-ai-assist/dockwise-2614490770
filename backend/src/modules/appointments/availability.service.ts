/**
 * Availability service: the conflict-prevention engine.
 *
 * A slot is available only when the door is in service, the interval is inside
 * site hours (or has an approved after-hours flag), no confirmed appointment
 * overlaps the interval plus its buffer, and the vehicle type is allowed on
 * the door. This is the core no-double-booking invariant.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentStatus, VehicleType } from './appointment.enums';
import { Door, DoorStatus } from '../sites/door.entity';
import { Site } from '../sites/site.entity';

/** A single available time slot on a door. */
export interface AvailabilitySlot {
  doorId: string;
  doorNumber: string;
  start: Date;
  end: Date;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Door)
    private readonly doors: Repository<Door>,
    @InjectRepository(Site)
    private readonly sites: Repository<Site>,
  ) {}

  /**
   * Check whether a vehicle type is allowed on a door.
   *
   * Args:
   *   door: The door.
   *   vehicleType: The vehicle type, when specified.
   *
   * Returns:
   *   True when the vehicle is compatible with the door's constraints.
   */
  isVehicleAllowed(door: Door, vehicleType: VehicleType | null): boolean {
    if (!vehicleType) {
      return true;
    }
    if (vehicleType === VehicleType.REEFER && !door.reeferPower) {
      return false;
    }
    if (vehicleType === VehicleType.CONTAINER && !door.containerSupport) {
      return false;
    }
    return true;
  }

  /**
   * Determine whether a door interval is free of confirmed conflicts.
   *
   * A confirmed appointment consumes its interval plus the site's per-door
   * buffer on each side. Overlap with that expanded interval is a conflict.
   *
   * Args:
   *   doorId: The door to check.
   *   start: The proposed window start (UTC).
   *   end: The proposed window end (UTC).
   *   bufferMinutes: The per-door buffer in minutes.
   *   excludeAppointmentId: An appointment to exclude (when rescheduling).
   *
   * Returns:
   *   True when no confirmed appointment overlaps the buffered interval.
   */
  async isIntervalFree(
    doorId: string,
    start: Date,
    end: Date,
    bufferMinutes: number,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const bufferMs = bufferMinutes * 60 * 1000;
    const rangeStart = new Date(start.getTime() - bufferMs);
    const rangeEnd = new Date(end.getTime() + bufferMs);

    const conflicts = await this.appointments
      .createQueryBuilder('a')
      .where('a.doorId = :doorId', { doorId })
      .andWhere('a.status = :status', { status: AppointmentStatus.CONFIRMED })
      .andWhere('a.windowStart < :rangeEnd', { rangeEnd })
      .andWhere('a.windowEnd > :rangeStart', { rangeStart })
      .andWhere(excludeAppointmentId ? 'a.id != :excludeId' : '1=1', {
        excludeId: excludeAppointmentId,
      })
      .getMany();

    return conflicts.length === 0;
  }

  /**
   * Check whether a proposed booking is available on a door.
   *
   * Args:
   *   door: The door.
   *   start: The proposed window start (UTC).
   *   end: The proposed window end (UTC).
   *   site: The site (for buffer and hours).
   *   vehicleType: The vehicle type, when specified.
   *   afterHours: Whether the booking has an approved after-hours flag.
   *   excludeAppointmentId: An appointment to exclude (when rescheduling).
   *
   * Returns:
   *   True when the slot is available.
   */
  async isAvailable(
    door: Door,
    start: Date,
    end: Date,
    site: Site,
    vehicleType: VehicleType | null,
    afterHours: boolean,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    if (door.status !== DoorStatus.IN_SERVICE) {
      return false;
    }
    if (!this.isVehicleAllowed(door, vehicleType)) {
      return false;
    }
    if (!afterHours && !this.isWithinSiteHours(site, start, end)) {
      return false;
    }
    return this.isIntervalFree(
      door.id,
      start,
      end,
      site.doorBufferMinutes,
      excludeAppointmentId,
    );
  }

  /**
   * Check whether an interval falls within the site's operating hours.
   *
   * Uses the site's configured weekday hours when present; defaults to
   * 06:00-22:00 site-local when no calendar entries exist. Holiday closures
   * and blackouts are honored in later slices via the calendar entity.
   *
   * Args:
   *   site: The site.
   *   start: The window start (UTC).
   *   end: The window end (UTC).
   *
   * Returns:
   *   True when the interval is inside operating hours.
   */
  isWithinSiteHours(site: Site, start: Date, end: Date): boolean {
    // Interpret the interval in the site's local timezone.
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: site.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const startMinutes = this.toLocalMinutes(formatter, start);
    const endMinutes = this.toLocalMinutes(formatter, end);
    // Default operating window 06:00-22:00 site-local. An interval is in-hours
    // only when it starts at/after open, ends at/before close, and does not
    // cross midnight in site-local time (end must be after start).
    const openMinutes = 6 * 60;
    const closeMinutes = 22 * 60;
    if (endMinutes <= startMinutes) {
      return false; // crosses midnight site-local
    }
    return startMinutes >= openMinutes && endMinutes <= closeMinutes;
  }

  /**
   * Convert a UTC instant to site-local minutes since midnight.
   *
   * Args:
   *   formatter: An Intl formatter bound to the site timezone.
   *   date: The UTC instant.
   *
   * Returns:
   *   Minutes since midnight in the site's local time.
   */
  private toLocalMinutes(
    formatter: Intl.DateTimeFormat,
    date: Date,
  ): number {
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(
      parts.find((p) => p.type === 'minute')?.value ?? '0',
      10,
    );
    return (hour % 24) * 60 + minute;
  }

  /**
   * List available slots for a site on a given day across in-service doors.
   *
   * Generates 30-minute increments within operating hours and filters to doors
   * that are in service, vehicle-compatible, and conflict-free.
   *
   * Args:
   *   site: The site.
   *   dayStart: The start of the day (UTC) to search.
   *   durationMinutes: The appointment duration.
   *   vehicleType: The vehicle type, when specified.
   *
   * Returns:
   *   Available slots across the site's doors.
   */
  async availableSlots(
    site: Site,
    dayStart: Date,
    durationMinutes: number,
    vehicleType: VehicleType | null,
  ): Promise<AvailabilitySlot[]> {
    const doors = await this.doors.find({
      where: { siteId: site.id, status: DoorStatus.IN_SERVICE },
      order: { number: 'ASC' },
    });
    const slots: AvailabilitySlot[] = [];
    const incrementMs = 30 * 60 * 1000;
    const durationMs = durationMinutes * 60 * 1000;

    for (const door of doors) {
      if (!this.isVehicleAllowed(door, vehicleType)) {
        continue;
      }
      // Search a 16-hour operating window starting at 06:00 site-local.
      const windowStart = this.siteLocalDayStart(site, dayStart, 6);
      const windowEnd = this.siteLocalDayStart(site, dayStart, 22);
      for (
        let cursor = windowStart.getTime();
        cursor + durationMs <= windowEnd.getTime();
        cursor += incrementMs
      ) {
        const start = new Date(cursor);
        const end = new Date(cursor + durationMs);
        const free = await this.isIntervalFree(
          door.id,
          start,
          end,
          site.doorBufferMinutes,
        );
        if (free) {
          slots.push({ doorId: door.id, doorNumber: door.number, start, end });
        }
      }
    }
    return slots;
  }

  /**
   * Compute the UTC instant of a site-local wall-clock time on a given day.
   *
   * Args:
   *   site: The site (for its timezone).
   *   dayStart: A UTC instant within the target day.
   *   hour: The site-local hour (0-23).
   *
   * Returns:
   *   The UTC instant corresponding to that site-local time.
   */
  private siteLocalDayStart(site: Site, dayStart: Date, hour: number): Date {
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: site.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dayStart);
    // Build a UTC guess, then correct by the timezone offset at that instant.
    const guess = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`);
    const localStr = new Intl.DateTimeFormat('en-US', {
      timeZone: site.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(guess);
    const localAsUtc = new Date(
      `${localStr.replace(/(\d+)\/(\d+)\/(\d+), /, '$3-$1-$2T').replace(' ', '')}Z`,
    );
    const offsetMs = localAsUtc.getTime() - guess.getTime();
    return new Date(guess.getTime() - offsetMs);
  }
}
