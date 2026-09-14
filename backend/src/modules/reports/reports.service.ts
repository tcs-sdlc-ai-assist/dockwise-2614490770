/**
 * Reports service: 90-day operational search with tenant/carrier scoping.
 *
 * Site operations search the last 90 days by tenant, carrier, plate, PO,
 * confirmation number, or status. Tenants are restricted to their visits and
 * carriers to visits where they are the carrier.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from '../visits/visit.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AuthPrincipal } from '../auth/auth.service';

/** A search filter set. */
export interface SearchFilters {
  siteId: string;
  tenantId?: string;
  carrierId?: string;
  plate?: string;
  po?: string;
  confirmationCode?: string;
  status?: string;
}

/** A search result row joining an appointment with its visit. */
export interface SearchResultRow {
  appointmentId: string;
  confirmationCode: string;
  tenantId: string;
  carrierId: string | null;
  carrierName: string | null;
  status: string;
  windowStart: Date;
  windowEnd: Date;
  tractorPlate: string | null;
  trailerNumber: string | null;
  driverName: string | null;
  visitId: string | null;
  arrivedAt: Date | null;
  exitedAt: Date | null;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Visit)
    private readonly visits: Repository<Visit>,
  ) {}

  /**
   * Search appointments/visits within the last 90 days, scoped to the caller.
   *
   * Args:
   *   filters: The search filters.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   Matching rows, newest first.
   */
  async search(
    filters: SearchFilters,
    principal: AuthPrincipal,
  ): Promise<SearchResultRow[]> {
    const isOperator = principal.memberships.some(
      (m) => m.organizationType === 'property_operator',
    );
    const tenantIds = principal.memberships
      .filter((m) => m.organizationType === 'tenant')
      .map((m) => m.organizationId);
    const carrierIds = principal.memberships
      .filter((m) => m.organizationType === 'carrier')
      .map((m) => m.organizationId);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const qb = this.appointments
      .createQueryBuilder('a')
      .leftJoin(Visit, 'v', 'v.appointmentId = a.id')
      .addSelect([
        'v.id',
        'v.arrivedAt',
        'v.exitedAt',
        'v.driverName',
        'v.tractorPlate',
        'v.trailerNumber',
      ])
      .where('a.siteId = :siteId', { siteId: filters.siteId })
      .andWhere('a.windowStart >= :since', { since: ninetyDaysAgo });

    // Tenant/carrier scoping.
    if (!isOperator) {
      const ids = [...tenantIds, ...carrierIds];
      if (ids.length === 0) {
        return [];
      }
      qb.andWhere('(a.tenantId IN (:...ids) OR a.carrierId IN (:...ids))', {
        ids,
      });
    }

    // Filters.
    if (filters.tenantId) {
      qb.andWhere('a.tenantId = :tenantId', { tenantId: filters.tenantId });
    }
    if (filters.carrierId) {
      qb.andWhere('a.carrierId = :carrierId', { carrierId: filters.carrierId });
    }
    if (filters.plate) {
      qb.andWhere(
        '(a.tractorPlate LIKE :plate OR v.tractorPlate LIKE :plate)',
        { plate: `%${filters.plate}%` },
      );
    }
    if (filters.po) {
      qb.andWhere('a.referenceText LIKE :po', { po: `%${filters.po}%` });
    }
    if (filters.confirmationCode) {
      qb.andWhere('a.confirmationCode LIKE :code', {
        code: `%${filters.confirmationCode}%`,
      });
    }
    if (filters.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    }

    qb.orderBy('a.windowStart', 'DESC');

    const { entities, raw } = await qb.getRawAndEntities();
    const visitByAppointmentId = new Map<string, Record<string, unknown>>();
    for (const r of raw) {
      if (r.v_id) {
        visitByAppointmentId.set(r.a_id, r);
      }
    }

    return entities.map((a) => {
      const v = visitByAppointmentId.get(a.id);
      return {
        appointmentId: a.id,
        confirmationCode: a.confirmationCode,
        tenantId: a.tenantId,
        carrierId: a.carrierId,
        carrierName: a.carrierName,
        status: a.status,
        windowStart: a.windowStart,
        windowEnd: a.windowEnd,
        tractorPlate: (v?.v_tractorPlate as string) ?? a.tractorPlate,
        trailerNumber: (v?.v_trailerNumber as string) ?? a.trailerNumber,
        driverName: (v?.v_driverName as string) ?? null,
        visitId: (v?.v_id as string) ?? null,
        arrivedAt: (v?.v_arrivedAt as Date) ?? null,
        exitedAt: (v?.v_exitedAt as Date) ?? null,
      };
    });
  }
}
