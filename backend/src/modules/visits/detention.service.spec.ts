/**
 * Unit tests for DetentionService estimate computation and pause rules.
 *
 * Covers clock start (later of window start or arrival), clock stop (load
 * complete), free time, billable minutes minus pauses, the tenant-cannot-pause
 * rule, and the mandatory display-only disclaimer.
 */
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DetentionService, DETENTION_DISCLAIMER } from './detention.service';
import { Visit, VisitStatus } from './visit.entity';
import { DetentionPause, DetentionPauseReason } from './detention-pause.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus, ActivityType } from '../appointments/appointment.enums';
import { Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';
import { makePrincipal } from '../../test-utils/make-principal';

describe('DetentionService', () => {
  let dataSource: DataSource;
  let visits: Repository<Visit>;
  let pauses: Repository<DetentionPause>;
  let appointments: Repository<Appointment>;
  let service: DetentionService;
  let appointment: Appointment;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    visits = dataSource.getRepository(Visit);
    pauses = dataSource.getRepository(DetentionPause);
    appointments = dataSource.getRepository(Appointment);
    service = new DetentionService(visits, pauses, appointments);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await pauses.clear();
    await visits.clear();
    await appointments.clear();
    appointment = await appointments.save(
      appointments.create({
        confirmationCode: 'DET12345',
        siteId: 'site-1',
        tenantId: 'tenant-1',
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: new Date('2025-06-02T12:00:00Z'),
        windowEnd: new Date('2025-06-02T13:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
      }),
    );
  });

  async function makeVisit(
    arrivedAt: Date,
    loadCompleteAt: Date | null,
  ): Promise<Visit> {
    return visits.save(
      visits.create({
        siteId: 'site-1',
        appointmentId: appointment.id,
        tenantId: 'tenant-1',
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL1',
        status: VisitStatus.COMPLETE,
        arrivedAt,
        loadCompleteAt,
      }),
    );
  }

  it('computes clock start as the later of window start or arrival', async () => {
    // Arrived 30 min after window start.
    const visit = await makeVisit(
      new Date('2025-06-02T12:30:00Z'),
      new Date('2025-06-02T15:30:00Z'),
    );
    const est = await service.estimate(visit.id, 120);
    expect(est.clockStart.toISOString()).toBe('2025-06-02T12:30:00.000Z');
    expect(est.clockStop?.toISOString()).toBe('2025-06-02T15:30:00.000Z');
  });

  it('computes billable minutes as elapsed minus free time', async () => {
    // Arrived on time; 4 hours elapsed (240 min) - 120 free = 120 billable.
    const visit = await makeVisit(
      new Date('2025-06-02T12:00:00Z'),
      new Date('2025-06-02T16:00:00Z'),
    );
    const est = await service.estimate(visit.id, 120);
    expect(est.billableMinutes).toBe(120);
  });

  it('returns zero billable minutes within free time', async () => {
    const visit = await makeVisit(
      new Date('2025-06-02T12:00:00Z'),
      new Date('2025-06-02T13:30:00Z'), // 90 min < 120 free
    );
    const est = await service.estimate(visit.id, 120);
    expect(est.billableMinutes).toBe(0);
  });

  it('subtracts pauses from billable minutes', async () => {
    const visit = await makeVisit(
      new Date('2025-06-02T12:00:00Z'),
      new Date('2025-06-02T16:00:00Z'), // 240 min - 120 free = 120 billable
    );
    const coordinator = makePrincipal(Role.SITE_COORDINATOR);
    await service.pause(
      visit.id,
      DetentionPauseReason.SITE_FAULT,
      'Door breakdown',
      new Date('2025-06-02T13:00:00Z'),
      new Date('2025-06-02T13:45:00Z'), // 45-min pause
      coordinator,
    );
    const est = await service.estimate(visit.id, 120);
    expect(est.pausedMinutes).toBe(45);
    expect(est.billableMinutes).toBe(75);
  });

  it('forbids a tenant from pausing its own clock', async () => {
    const visit = await makeVisit(
      new Date('2025-06-02T12:00:00Z'),
      new Date('2025-06-02T16:00:00Z'),
    );
    const tenant = makePrincipal(Role.TENANT_ADMIN, 'tenant', 'tenant-1');
    await expect(
      service.pause(
        visit.id,
        DetentionPauseReason.SITE_FAULT,
        null,
        new Date('2025-06-02T13:00:00Z'),
        new Date('2025-06-02T13:30:00Z'),
        tenant,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('always carries the display-only disclaimer', async () => {
    const visit = await makeVisit(
      new Date('2025-06-02T12:00:00Z'),
      new Date('2025-06-02T16:00:00Z'),
    );
    const est = await service.estimate(visit.id);
    expect(est.disclaimer).toBe(DETENTION_DISCLAIMER);
  });

  it('throws NotFoundException for a missing visit', async () => {
    await expect(service.estimate('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
