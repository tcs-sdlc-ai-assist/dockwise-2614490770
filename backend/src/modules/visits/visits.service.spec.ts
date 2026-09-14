/**
 * Unit tests for GateService and DockService visit lifecycle.
 *
 * Covers check-in with required plate/trailer, dock event ordering, check-out
 * with the gate_closed_without_dock tag, unscheduled visits, turn-away, and
 * after-the-fact check-in.
 */
import { DataSource, Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GateService } from './gate.service';
import { DockService } from './dock.service';
import { Visit, VisitStatus } from './visit.entity';
import { VisitEvent } from './visit-event.entity';
import {
  UnscheduledVisit,
  UnscheduledReason,
  UnscheduledStatus,
} from './unscheduled-visit.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus, ActivityType } from '../appointments/appointment.enums';
import { newTestDataSource } from '../../test-utils/test-db';

describe('GateService & DockService', () => {
  let dataSource: DataSource;
  let visits: Repository<Visit>;
  let events: Repository<VisitEvent>;
  let unscheduled: Repository<UnscheduledVisit>;
  let appointments: Repository<Appointment>;
  let gate: GateService;
  let dock: DockService;
  let appointment: Appointment;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    visits = dataSource.getRepository(Visit);
    events = dataSource.getRepository(VisitEvent);
    unscheduled = dataSource.getRepository(UnscheduledVisit);
    appointments = dataSource.getRepository(Appointment);
    gate = new GateService(visits, events, unscheduled, appointments);
    dock = new DockService(visits, events, appointments);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await events.clear();
    await visits.clear();
    await unscheduled.clear();
    await appointments.clear();
    appointment = await appointments.save(
      appointments.create({
        confirmationCode: 'GATE1234',
        siteId: 'site-1',
        tenantId: 'tenant-1',
        doorId: 'door-1',
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: new Date('2025-06-02T12:00:00Z'),
        windowEnd: new Date('2025-06-02T13:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
      }),
    );
  });

  const checkInDto = {
    driverName: 'Sam Driver',
    tractorPlate: 'ABC123',
    trailerNumber: 'TRL456',
  };

  it('checks in a vehicle, creating a visit with plate and trailer', async () => {
    const visit = await gate.checkIn(appointment.id, checkInDto, 'gate-1');
    expect(visit.status).toBe(VisitStatus.ARRIVED);
    expect(visit.tractorPlate).toBe('ABC123');
    expect(visit.trailerNumber).toBe('TRL456');
    expect(visit.arrivedAt).toBeTruthy();
    const updated = await appointments.findOne({
      where: { id: appointment.id },
    });
    expect(updated?.status).toBe(AppointmentStatus.ARRIVED);
  });

  it('rejects a duplicate active check-in for the same appointment', async () => {
    await gate.checkIn(appointment.id, checkInDto, 'gate-1');
    await expect(
      gate.checkIn(appointment.id, checkInDto, 'gate-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records dock events in order: door_ready, load_start, load_complete', async () => {
    const visit = await gate.checkIn(appointment.id, checkInDto, 'gate-1');
    const atDoor = await dock.recordDockEvent(visit.id, 'door_ready', 'dock-1');
    expect(atDoor.status).toBe(VisitStatus.AT_DOOR);
    expect(atDoor.doorReadyAt).toBeTruthy();

    const inProgress = await dock.recordDockEvent(visit.id, 'load_start', 'dock-1');
    expect(inProgress.status).toBe(VisitStatus.IN_PROGRESS);
    expect(inProgress.loadStartAt).toBeTruthy();

    const complete = await dock.recordDockEvent(visit.id, 'load_complete', 'dock-1');
    expect(complete.status).toBe(VisitStatus.COMPLETE);
    expect(complete.loadCompleteAt).toBeTruthy();
  });

  it('rejects an out-of-order dock event', async () => {
    const visit = await gate.checkIn(appointment.id, checkInDto, 'gate-1');
    await expect(
      dock.recordDockEvent(visit.id, 'load_complete', 'dock-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks out a completed visit', async () => {
    const visit = await gate.checkIn(appointment.id, checkInDto, 'gate-1');
    await dock.recordDockEvent(visit.id, 'door_ready', 'dock-1');
    await dock.recordDockEvent(visit.id, 'load_start', 'dock-1');
    await dock.recordDockEvent(visit.id, 'load_complete', 'dock-1');
    const exited = await gate.checkOut(
      visit.id,
      { outboundSeal: 'SEAL99', outboundLoadState: 'loaded' },
      'gate-1',
    );
    expect(exited.status).toBe(VisitStatus.EXITED);
    expect(exited.exitedAt).toBeTruthy();
    expect(exited.gateClosedWithoutDock).toBe(false);
  });

  it('tags checkout gate_closed_without_dock when dock has not completed', async () => {
    const visit = await gate.checkIn(appointment.id, checkInDto, 'gate-1');
    const exited = await gate.checkOut(visit.id, {}, 'gate-1');
    expect(exited.status).toBe(VisitStatus.EXITED);
    expect(exited.gateClosedWithoutDock).toBe(true);
  });

  it('logs an unscheduled visit with a required reason', async () => {
    const record = await gate.logUnscheduled(
      {
        siteId: 'site-1',
        tenantId: 'tenant-1',
        carrierName: 'Northstar',
        tractorPlate: 'XYZ789',
        reason: UnscheduledReason.HOT_LOAD,
      },
      'gate-1',
    );
    expect(record.status).toBe(UnscheduledStatus.PENDING);
    expect(record.reason).toBe(UnscheduledReason.HOT_LOAD);
  });

  it('turns away an unscheduled visit and retains the record', async () => {
    const record = await gate.logUnscheduled(
      {
        siteId: 'site-1',
        tractorPlate: 'XYZ789',
        reason: UnscheduledReason.WRONG_DAY,
      },
      'gate-1',
    );
    const turned = await gate.turnAway(record.id, 'coord-1');
    expect(turned.status).toBe(UnscheduledStatus.TURNED_AWAY);
    const list = await gate.listUnscheduled('site-1');
    expect(list.map((r) => r.id)).toContain(record.id);
  });

  it('records an after-the-fact check-in with reason and original time', async () => {
    const original = new Date('2025-06-02T11:55:00Z');
    const visit = await gate.afterTheFactCheckIn(
      appointment.id,
      checkInDto,
      'Gate system outage',
      original,
      'coord-1',
    );
    expect(visit.arrivedAt.toISOString()).toBe(original.toISOString());
    expect(visit.reason).toBe('Gate system outage');
  });

  it('throws NotFoundException for check-in on a missing appointment', async () => {
    await expect(
      gate.checkIn('missing', checkInDto, 'gate-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
