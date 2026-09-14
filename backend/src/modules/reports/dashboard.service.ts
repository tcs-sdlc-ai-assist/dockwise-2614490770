/**
 * Dashboard service: site-admin and tenant-admin operational metrics.
 *
 * Computes appointments by status over the last 7/30 days, on-time arrival
 * percent, average dwell (arrive to complete), unscheduled and turn-away
 * counts, and late-cancel/no-show counts by tenant.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus } from '../appointments/appointment.enums';
import { Visit } from '../visits/visit.entity';
import {
  UnscheduledVisit,
  UnscheduledStatus,
} from '../visits/unscheduled-visit.entity';
import { AuthPrincipal } from '../auth/auth.service';

/** The dashboard metrics. */
export interface DashboardMetrics {
  siteId: string;
  /** Appointments by status over the last 7 days. */
  byStatus7d: Record<string, number>;
  /** Appointments by status over the last 30 days. */
  byStatus30d: Record<string, number>;
  /** On-time arrival percent (within window plus early grace). */
  onTimePercent: number | null;
  /** Average dwell in minutes (arrive to complete). */
  avgDwellMinutes: number | null;
  /** Unscheduled visit count. */
  unscheduledCount: number;
  /** Turn-away count. */
  turnAwayCount: number;
  /** Late-cancel count. */
  lateCancelCount: number;
  /** No-show count. */
  noShowCount: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Visit)
    private readonly visits: Repository<Visit>,
    @InjectRepository(UnscheduledVisit)
    private readonly unscheduled: Repository<UnscheduledVisit>,
  ) {}

  /**
   * Compute the dashboard metrics for a site, scoped to the caller's tenant
   * when the caller is a tenant admin.
   *
   * Args:
   *   siteId: The site id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The dashboard metrics.
   */
  async metrics(
    siteId: string,
    principal: AuthPrincipal,
  ): Promise<DashboardMetrics> {
    const tenantIds = principal.memberships
      .filter((m) => m.organizationType === 'tenant')
      .map((m) => m.organizationId);
    const isTenantOnly =
      tenantIds.length > 0 &&
      !principal.memberships.some(
        (m) => m.organizationType === 'property_operator',
      );

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const qb = this.appointments
      .createQueryBuilder('a')
      .where('a.siteId = :siteId', { siteId })
      .andWhere('a.windowStart >= :thirtyDaysAgo', { thirtyDaysAgo });
    if (isTenantOnly) {
      qb.andWhere('a.tenantId IN (:...tenantIds)', { tenantIds });
    }
    const appts = await qb.getMany();

    const byStatus7d: Record<string, number> = {};
    const byStatus30d: Record<string, number> = {};
    for (const a of appts) {
      byStatus30d[a.status] = (byStatus30d[a.status] ?? 0) + 1;
      if (a.windowStart.getTime() >= sevenDaysAgo.getTime()) {
        byStatus7d[a.status] = (byStatus7d[a.status] ?? 0) + 1;
      }
    }

    // On-time arrival percent and average dwell from visits.
    const visitQb = this.visits
      .createQueryBuilder('v')
      .where('v.siteId = :siteId', { siteId });
    if (isTenantOnly) {
      visitQb.andWhere('v.tenantId IN (:...tenantIds)', { tenantIds });
    }
    const visitRows = await visitQb.getMany();

    let onTime = 0;
    let arrivalCount = 0;
    let dwellSum = 0;
    let dwellCount = 0;
    for (const v of visitRows) {
      if (v.appointmentId) {
        const appt = appts.find((a) => a.id === v.appointmentId);
        if (appt) {
          arrivalCount += 1;
          // On time = arrived within window start + 30-min early grace.
          const graceEnd = appt.windowStart.getTime() + 30 * 60 * 1000;
          if (v.arrivedAt.getTime() <= graceEnd) {
            onTime += 1;
          }
        }
      }
      if (v.loadCompleteAt) {
        dwellSum +=
          (v.loadCompleteAt.getTime() - v.arrivedAt.getTime()) / 60000;
        dwellCount += 1;
      }
    }

    const unscheduledQb = this.unscheduled
      .createQueryBuilder('u')
      .where('u.siteId = :siteId', { siteId });
    if (isTenantOnly) {
      unscheduledQb.andWhere('u.tenantId IN (:...tenantIds)', { tenantIds });
    }
    const unscheduledRows = await unscheduledQb.getMany();

    const lateCancelCount = appts.filter(
      (a) =>
        a.status === AppointmentStatus.CANCELLED &&
        a.statusReason === 'late_cancel',
    ).length;
    const noShowCount = appts.filter(
      (a) => a.status === AppointmentStatus.NO_SHOW,
    ).length;

    return {
      siteId,
      byStatus7d,
      byStatus30d,
      onTimePercent:
        arrivalCount > 0 ? Math.round((onTime / arrivalCount) * 100) : null,
      avgDwellMinutes: dwellCount > 0 ? Math.round(dwellSum / dwellCount) : null,
      unscheduledCount: unscheduledRows.length,
      turnAwayCount: unscheduledRows.filter(
        (u) => u.status === UnscheduledStatus.TURNED_AWAY,
      ).length,
      lateCancelCount,
      noShowCount,
    };
  }
}
