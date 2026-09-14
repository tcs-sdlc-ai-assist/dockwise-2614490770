/**
 * Unit tests for the AvailabilityService conflict-prevention engine.
 *
 * Covers the no-double-booking invariant (buffered overlap), out-of-service
 * doors, vehicle compatibility, and site-hours checks against a real SQLite
 * test database.
 */
import { DataSource, Repository } from 'typeorm';
import { AvailabilityService } from './availability.service';
import { Appointment } from './appointment.entity';
import { AppointmentStatus, ActivityType, VehicleType } from './appointment.enums';
import { Door, DoorStatus, DoorType } from '../sites/door.entity';
import { Site } from '../sites/site.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('AvailabilityService', () => {
  let dataSource: DataSource;
  let appointments: Repository<Appointment>;
  let doors: Repository<Door>;
  let sites: Repository<Site>;
  let service: AvailabilityService;
  let site: Site;
  let door: Door;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    appointments = dataSource.getRepository(Appointment);
    doors = dataSource.getRepository(Door);
    sites = dataSource.getRepository(Site);
    service = new AvailabilityService(appointments, doors, sites);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
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
    door = await doors.save(
      doors.create({
        siteId: site.id,
        number: '11',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
        status: DoorStatus.IN_SERVICE,
      }),
    );
  });

  async function confirm(startHour: number, endHour: number): Promise<Appointment> {
    const start = new Date('2025-06-02T00:00:00Z');
    start.setUTCHours(startHour, 0, 0, 0);
    const end = new Date('2025-06-02T00:00:00Z');
    end.setUTCHours(endHour, 0, 0, 0);
    return appointments.save(
      appointments.create({
        confirmationCode: 'ABC12345',
        siteId: site.id,
        tenantId: 'tenant-1',
        doorId: door.id,
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: start,
        windowEnd: end,
        status: AppointmentStatus.CONFIRMED,
      }),
    );
  }

  it('reports a free interval as available', async () => {
    const start = new Date('2025-06-02T14:00:00Z');
    const end = new Date('2025-06-02T15:30:00Z');
    const free = await service.isIntervalFree(door.id, start, end, 10);
    expect(free).toBe(true);
  });

  it('detects a direct overlap with a confirmed appointment', async () => {
    await confirm(14, 16); // 14:00-16:00 UTC confirmed
    const start = new Date('2025-06-02T15:00:00Z');
    const end = new Date('2025-06-02T16:30:00Z');
    const free = await service.isIntervalFree(door.id, start, end, 10);
    expect(free).toBe(false);
  });

  it('detects an overlap within the buffer window', async () => {
    await confirm(14, 16); // 14:00-16:00 UTC confirmed, 10-min buffer
    // Proposed 16:05-17:00 starts 5 min after end -> inside the 10-min buffer.
    const start = new Date('2025-06-02T16:05:00Z');
    const end = new Date('2025-06-02T17:00:00Z');
    const free = await service.isIntervalFree(door.id, start, end, 10);
    expect(free).toBe(false);
  });

  it('allows a slot just outside the buffer window', async () => {
    await confirm(14, 16);
    const start = new Date('2025-06-02T16:15:00Z');
    const end = new Date('2025-06-02T17:00:00Z');
    const free = await service.isIntervalFree(door.id, start, end, 10);
    expect(free).toBe(true);
  });

  it('rejects an out-of-service door', async () => {
    door.status = DoorStatus.OUT_OF_SERVICE;
    await doors.save(door);
    const start = new Date('2025-06-02T14:00:00Z');
    const end = new Date('2025-06-02T15:00:00Z');
    const available = await service.isAvailable(
      door,
      start,
      end,
      site,
      null,
      false,
    );
    expect(available).toBe(false);
  });

  it('rejects a reefer on a door without reefer power', async () => {
    expect(service.isVehicleAllowed(door, VehicleType.REEFER)).toBe(false);
    expect(service.isVehicleAllowed(door, VehicleType.BOX_TRUCK)).toBe(true);
  });

  it('rejects a container on a door without container support', async () => {
    expect(service.isVehicleAllowed(door, VehicleType.CONTAINER)).toBe(false);
  });

  it('checks site hours using the default 06:00-22:00 window', async () => {
    // 12:00-13:00 UTC = 08:00-09:00 EDT (within hours).
    const inStart = new Date('2025-06-02T12:00:00Z');
    const inEnd = new Date('2025-06-02T13:00:00Z');
    expect(service.isWithinSiteHours(site, inStart, inEnd)).toBe(true);
    // 01:00-02:00 UTC = 21:00-22:00 EDT previous day boundary; use a clearly
    // after-hours slot: 03:00-04:00 UTC = 23:00-00:00 EDT (after close).
    const outStart = new Date('2025-06-02T03:00:00Z');
    const outEnd = new Date('2025-06-02T04:00:00Z');
    expect(service.isWithinSiteHours(site, outStart, outEnd)).toBe(false);
  });
});
