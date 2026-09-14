/**
 * Detention service: the display-only detention estimate.
 *
 * Computes the detention estimate from the visit's timestamps and the tenant's
 * free-time allowance, subtracting coordinator-recorded pauses. Every estimate
 * is labeled "Not an invoice. For discussion only." — Dockwise never invoices
 * or pays detention.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from './visit.entity';
import { DetentionPause, DetentionPauseReason } from './detention-pause.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AuthPrincipal } from '../auth/auth.service';

/** The mandatory display label for every detention estimate. */
export const DETENTION_DISCLAIMER = 'Not an invoice. For discussion only.';

/** The detention estimate for a visit. */
export interface DetentionEstimate {
  visitId: string;
  /** Gate arrival timestamp. */
  arrival: Date;
  /** Clock start: later of window start or arrival. */
  clockStart: Date;
  /** Clock stop: load complete (not exit). */
  clockStop: Date | null;
  /** Free-time allowance in minutes (tenant contract, default 120). */
  freeTimeMinutes: number;
  /** Total paused minutes subtracted from the billable time. */
  pausedMinutes: number;
  /** Billable minutes: max(0, clock stop - clock start - free time) - pauses. */
  billableMinutes: number;
  /** The mandatory display-only disclaimer. */
  disclaimer: string;
}

@Injectable()
export class DetentionService {
  constructor(
    @InjectRepository(Visit)
    private readonly visits: Repository<Visit>,
    @InjectRepository(DetentionPause)
    private readonly pauses: Repository<DetentionPause>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  /**
   * Compute the detention estimate for a visit.
   *
   * Args:
   *   visitId: The visit id.
   *   freeTimeMinutes: The tenant's free-time allowance (default 120).
   *
   * Returns:
   *   The detention estimate with the display-only disclaimer.
   *
   * Raises:
   *   NotFoundException: When the visit does not exist.
   */
  async estimate(
    visitId: string,
    freeTimeMinutes = 120,
  ): Promise<DetentionEstimate> {
    const visit = await this.visits.findOne({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    // Clock start is the later of window start or arrival.
    let windowStart = visit.arrivedAt;
    if (visit.appointmentId) {
      const appointment = await this.appointments.findOne({
        where: { id: visit.appointmentId },
      });
      if (appointment) {
        windowStart = appointment.windowStart;
      }
    }
    const clockStart =
      visit.arrivedAt > windowStart ? visit.arrivedAt : windowStart;

    // Clock stop is load complete, not exit.
    const clockStop = visit.loadCompleteAt;

    // Sum pauses.
    const pauses = await this.pauses.find({ where: { visitId } });
    const pausedMinutes = pauses.reduce(
      (sum, p) => sum + Math.max(0, (p.endAt.getTime() - p.startAt.getTime()) / 60000),
      0,
    );

    let billableMinutes = 0;
    if (clockStop) {
      const elapsed = (clockStop.getTime() - clockStart.getTime()) / 60000;
      billableMinutes = Math.max(
        0,
        Math.round(elapsed - freeTimeMinutes - pausedMinutes),
      );
    }

    return {
      visitId,
      arrival: visit.arrivedAt,
      clockStart,
      clockStop,
      freeTimeMinutes,
      pausedMinutes: Math.round(pausedMinutes),
      billableMinutes,
      disclaimer: DETENTION_DISCLAIMER,
    };
  }

  /**
   * Record a detention pause for a visit (coordinator only).
   *
   * A tenant must not pause its own clock; the controller enforces the
   * coordinator role, and this method double-checks the caller is not a member
   * of the visit's tenant.
   *
   * Args:
   *   visitId: The visit id.
   *   reason: The pause reason category.
   *   detail: Optional free-text detail.
   *   startAt: The pause start.
   *   endAt: The pause end.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The created pause.
   *
   * Raises:
   *   NotFoundException: When the visit does not exist.
   *   ForbiddenException: When the caller belongs to the visit's tenant.
   */
  async pause(
    visitId: string,
    reason: DetentionPauseReason,
    detail: string | null,
    startAt: Date,
    endAt: Date,
    principal: AuthPrincipal,
  ): Promise<DetentionPause> {
    const visit = await this.visits.findOne({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }
    // A tenant must not pause its own clock.
    const tenantIds = principal.memberships
      .filter((m) => m.organizationType === 'tenant')
      .map((m) => m.organizationId);
    if (visit.tenantId && tenantIds.includes(visit.tenantId)) {
      throw new ForbiddenException('A tenant cannot pause its own clock');
    }
    const pause = this.pauses.create({
      visitId,
      reason,
      detail,
      startAt,
      endAt,
      actorUserId: principal.userId,
    });
    return this.pauses.save(pause);
  }

  /**
   * List pauses for a visit.
   *
   * Args:
   *   visitId: The visit id.
   *
   * Returns:
   *   The pauses ordered by start time.
   */
  async listPauses(visitId: string): Promise<DetentionPause[]> {
    return this.pauses.find({ where: { visitId }, order: { startAt: 'ASC' } });
  }
}
