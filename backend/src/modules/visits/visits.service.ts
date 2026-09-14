/**
 * Visits service: visit search and lifecycle queries.
 *
 * Gate staff find an appointment by confirmation number, plate, trailer, PO,
 * or tenant name. Search is scoped so tenants see only their visits and
 * carriers see only visits where they are the carrier.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from './visit.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AuthPrincipal } from '../auth/auth.service';

/** A search result pairing an appointment with any matching visit. */
export interface VisitSearchResult {
  appointmentId: string;
  confirmationCode: string;
  tenantId: string;
  status: string;
  windowStart: Date;
  windowEnd: Date;
  doorId: string | null;
  visitId: string | null;
}

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly visits: Repository<Visit>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  /**
   * Search appointments/visits by confirmation number, plate, trailer, PO, or
   * tenant name within a site.
   *
   * Args:
   *   siteId: The site id.
   *   query: The search term.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   Matching appointments with any linked visit id.
   */
  async search(
    siteId: string,
    query: string,
    principal: AuthPrincipal,
  ): Promise<VisitSearchResult[]> {
    const isOperator = principal.memberships.some(
      (m) => m.organizationType === 'property_operator',
    );
    const tenantIds = principal.memberships
      .filter((m) => m.organizationType === 'tenant')
      .map((m) => m.organizationId);
    const carrierIds = principal.memberships
      .filter((m) => m.organizationType === 'carrier')
      .map((m) => m.organizationId);

    const like = `%${query}%`;
    const qb = this.appointments
      .createQueryBuilder('a')
      .leftJoin(Visit, 'v', 'v.appointmentId = a.id')
      .addSelect('v.id', 'visitId')
      .where('a.siteId = :siteId', { siteId })
      .andWhere(
        '(a.confirmationCode LIKE :like OR a.tractorPlate LIKE :like OR a.trailerNumber LIKE :like OR a.referenceText LIKE :like OR a.carrierName LIKE :like)',
        { like },
      );

    if (!isOperator) {
      const ids = [...tenantIds, ...carrierIds];
      if (ids.length === 0) {
        return [];
      }
      qb.andWhere('(a.tenantId IN (:...ids) OR a.carrierId IN (:...ids))', {
        ids,
      });
    }

    const rows = await qb.getRawAndEntities();
    const visitIdByAppointmentId = new Map<string, string>();
    for (const raw of rows.raw) {
      if (raw.visitId) {
        visitIdByAppointmentId.set(raw.a_id, raw.visitId);
      }
    }
    return rows.entities.map((a) => ({
      appointmentId: a.id,
      confirmationCode: a.confirmationCode,
      tenantId: a.tenantId,
      status: a.status,
      windowStart: a.windowStart,
      windowEnd: a.windowEnd,
      doorId: a.doorId,
      visitId: visitIdByAppointmentId.get(a.id) ?? null,
    }));
  }

  /**
   * Find a visit by id.
   *
   * Raises:
   *   NotFoundException: When no visit exists with the id.
   */
  async findById(id: string): Promise<Visit> {
    const visit = await this.visits.findOne({ where: { id } });
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }
    return visit;
  }

  /**
   * Find the in-yard visit for an appointment, when one exists.
   *
   * Args:
   *   appointmentId: The appointment id.
   *
   * Returns:
   *   The matching visit, or null.
   */
  async findByAppointment(appointmentId: string): Promise<Visit | null> {
    return this.visits.findOne({ where: { appointmentId } });
  }
}
