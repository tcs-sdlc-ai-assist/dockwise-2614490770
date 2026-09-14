/**
 * Unit tests for QueueService: confirm/decline/counter, reassignment with
 * reason + history, and the exception list.
 */
import { DataSource, Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueueService } from './queue.service';
import { AvailabilityService } from './availability.service';
import { Appointment } from './appointment.entity';
import { AppointmentStatus, ActivityType } from './appointment.enums';
import { Reassignment, ReassignmentReason } from './reassignment.entity';
import { Door, DoorStatus, DoorType } from '../sites/door.entity';
import { Site } from '../sites/site.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('QueueService', () => {
  let dataSource: DataSource;
  let appointments: Repository<Appointment>;
  let reassignments: Repository<Reassignment>;
  let doors: Repository<Door>;
  let sites: Repository<Site>;
  let service: QueueService;
  let site: Site;
  let doorA: Door;
  let doorB: Door;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    appointments = dataSource.getRepository(Appointment);
    reassignments = dataSource.getRepository(Reassignment);
    doors = dataSource.getRepository(Door);
    sites = dataSource.getRepository(Site);
    const availability = new AvailabilityService(appointments, doors, sites);
    service = new QueueService(
      appointments,
      reassignments,
      doors,
      sites,
      availability,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await reassignments.clear();
    await appointments.clear();
    await doors.clear();
    await sites.clear();
    site = await sites.save(
      sites.create({
        name: 'Dayton',
        address: 'A',
        timezone: 'America/New_York',
        operatorId: 'org-1',
        doorBufferMinutes: 10,
      }),
    );
    doorA = await doors.save(
      doors.create({
        siteId: site.id,
        number: 'A',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
      }),
    );
    doorB = await doors.save(
      doors.create({
        siteId: site.id,
        number: 'B',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
      }),
    );
  });

  let codeCounter = 0;
  async function makeAppointment(
    status: AppointmentStatus,
    doorId: string | null,
    startIso = '2025-06-02T12:00:00Z',
    endIso = '2025-06-02T13:00:00Z',
  ): Promise<Appointment> {
    codeCounter += 1;
    return appointments.save(
      appointments.create({
        confirmationCode: `CODE${String(codeCounter).padStart(4, '0')}`,
        siteId: site.id,
        tenantId: 'tenant-1',
        doorId,
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: new Date(startIso),
        windowEnd: new Date(endIso),
        status,
      }),
    );
  }

  it('lists requested and countered appointments in the queue', async () => {
    await makeAppointment(AppointmentStatus.REQUESTED, doorA.id);
    await makeAppointment(AppointmentStatus.COUNTERED, doorB.id);
    await makeAppointment(AppointmentStatus.CONFIRMED, doorA.id, '2025-06-03T12:00:00Z', '2025-06-03T13:00:00Z');
    const queue = await service.queue(site.id);
    expect(queue).toHaveLength(2);
    expect(
      queue.every((a) =>
        [AppointmentStatus.REQUESTED, AppointmentStatus.COUNTERED].includes(
          a.status,
        ),
      ),
    ).toBe(true);
  });

  it('confirms a requested appointment', async () => {
    const appt = await makeAppointment(AppointmentStatus.REQUESTED, doorA.id);
    const confirmed = await service.confirm(appt.id);
    expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('returns 409 when confirming would double-book the door', async () => {
    await makeAppointment(AppointmentStatus.CONFIRMED, doorA.id);
    const conflicting = await makeAppointment(
      AppointmentStatus.REQUESTED,
      doorA.id,
    );
    await expect(service.confirm(conflicting.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('declines an appointment with a reason', async () => {
    const appt = await makeAppointment(AppointmentStatus.REQUESTED, doorA.id);
    const declined = await service.decline(appt.id, 'No capacity');
    expect(declined.status).toBe(AppointmentStatus.CANCELLED);
    expect(declined.statusReason).toBe('No capacity');
  });

  it('counters an appointment with a new window', async () => {
    const appt = await makeAppointment(AppointmentStatus.REQUESTED, doorA.id);
    const countered = await service.counter(
      appt.id,
      new Date('2025-06-02T15:00:00Z'),
      new Date('2025-06-02T16:00:00Z'),
    );
    expect(countered.status).toBe(AppointmentStatus.COUNTERED);
    expect(countered.windowStart.toISOString()).toBe('2025-06-02T15:00:00.000Z');
  });

  it('reassigns a door and records old and new door in history', async () => {
    const appt = await makeAppointment(AppointmentStatus.CONFIRMED, doorA.id);
    const updated = await service.reassign(
      appt.id,
      doorB.id,
      ReassignmentReason.DOOR_DOWN,
      'coord-1',
    );
    expect(updated.doorId).toBe(doorB.id);
    const history = await service.reassignmentHistory(appt.id);
    expect(history).toHaveLength(1);
    expect(history[0].fromDoorId).toBe(doorA.id);
    expect(history[0].toDoorId).toBe(doorB.id);
    expect(history[0].reason).toBe(ReassignmentReason.DOOR_DOWN);
  });

  it('returns 409 when reassigning to a conflicting door', async () => {
    await makeAppointment(AppointmentStatus.CONFIRMED, doorB.id);
    const appt = await makeAppointment(AppointmentStatus.CONFIRMED, doorA.id);
    await expect(
      service.reassign(appt.id, doorB.id, ReassignmentReason.OTHER, 'coord-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when reassigning to a missing door', async () => {
    const appt = await makeAppointment(AppointmentStatus.CONFIRMED, doorA.id);
    await expect(
      service.reassign(appt.id, 'missing', ReassignmentReason.OTHER, 'coord-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('surfaces confirmed appointments on out-of-service doors as exceptions', async () => {
    const appt = await makeAppointment(AppointmentStatus.CONFIRMED, doorA.id);
    doorA.status = DoorStatus.OUT_OF_SERVICE;
    await doors.save(doorA);
    const exceptions = await service.exceptions(site.id);
    expect(exceptions.map((a) => a.id)).toContain(appt.id);
  });

  it('surfaces overdue no-arrival appointments as exceptions', async () => {
    const past = await makeAppointment(
      AppointmentStatus.CONFIRMED,
      doorA.id,
      '2020-01-01T12:00:00Z',
      '2020-01-01T13:00:00Z',
    );
    const exceptions = await service.exceptions(site.id);
    expect(exceptions.map((a) => a.id)).toContain(past.id);
  });
});
