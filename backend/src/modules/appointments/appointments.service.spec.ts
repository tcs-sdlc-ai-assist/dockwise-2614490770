/**
 * Unit tests for AppointmentsService booking logic.
 *
 * Covers tenant isolation (403 on tampered tenant_id), auto-confirm on a free
 * leased in-hours door, requested status for pool/after-hours, the
 * no-double-booking 409, and confirmation-code format.
 */
import { DataSource, Repository } from 'typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';
import { Appointment } from './appointment.entity';
import { AppointmentStatus, ActivityType } from './appointment.enums';
import { Door, DoorStatus, DoorType } from '../sites/door.entity';
import { Site } from '../sites/site.entity';
import { Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';
import { makePrincipal } from '../../test-utils/make-principal';

describe('AppointmentsService', () => {
  let dataSource: DataSource;
  let appointments: Repository<Appointment>;
  let doors: Repository<Door>;
  let sites: Repository<Site>;
  let service: AppointmentsService;
  let site: Site;
  let leasedDoor: Door;
  let poolDoor: Door;

  const tenantId = 'tenant-1';

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    appointments = dataSource.getRepository(Appointment);
    doors = dataSource.getRepository(Door);
    sites = dataSource.getRepository(Site);
    const availability = new AvailabilityService(appointments, doors, sites);
    service = new AppointmentsService(
      appointments,
      doors,
      sites,
      availability,
    );
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
    leasedDoor = await doors.save(
      doors.create({
        siteId: site.id,
        number: 'L1',
        type: DoorType.DOCK_HIGH,
        group: `leased:${tenantId}`,
        status: DoorStatus.IN_SERVICE,
      }),
    );
    poolDoor = await doors.save(
      doors.create({
        siteId: site.id,
        number: 'P1',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
        status: DoorStatus.IN_SERVICE,
      }),
    );
  });

  function bookerPrincipal() {
    return makePrincipal(Role.TENANT_BOOKER, 'tenant', tenantId);
  }

  // 12:00-13:30 UTC = 08:00-09:30 EDT (in hours).
  const inHours = {
    windowStart: '2025-06-02T12:00:00Z',
    windowEnd: '2025-06-02T13:30:00Z',
  };

  it('auto-confirms a free leased in-hours booking and issues a code', async () => {
    const appt = await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: leasedDoor.id,
        activity: ActivityType.LIVE_UNLOAD,
        ...inHours,
      },
      bookerPrincipal(),
    );
    expect(appt.status).toBe(AppointmentStatus.CONFIRMED);
    expect(appt.confirmationCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('returns 403 when a booker books for another tenant', async () => {
    await expect(
      service.create(
        {
          siteId: site.id,
          tenantId: 'other-tenant',
          doorId: leasedDoor.id,
          activity: ActivityType.LIVE_UNLOAD,
          ...inHours,
        },
        bookerPrincipal(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a pool-door booking as requested', async () => {
    const appt = await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: poolDoor.id,
        activity: ActivityType.LIVE_UNLOAD,
        ...inHours,
      },
      bookerPrincipal(),
    );
    expect(appt.status).toBe(AppointmentStatus.REQUESTED);
  });

  it('creates an after-hours booking as requested even on a leased door', async () => {
    const appt = await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: leasedDoor.id,
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: '2025-06-02T01:00:00Z', // 21:00 EDT prior day
        windowEnd: '2025-06-02T02:00:00Z',
        afterHours: true,
      },
      bookerPrincipal(),
    );
    expect(appt.status).toBe(AppointmentStatus.REQUESTED);
  });

  it('returns 409 for an overlapping confirmed booking on the same door', async () => {
    await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: leasedDoor.id,
        activity: ActivityType.LIVE_UNLOAD,
        ...inHours,
      },
      bookerPrincipal(),
    );
    await expect(
      service.create(
        {
          siteId: site.id,
          tenantId,
          doorId: leasedDoor.id,
          activity: ActivityType.LIVE_LOAD,
          windowStart: '2025-06-02T13:00:00Z', // overlaps 12:00-13:30 + buffer
          windowEnd: '2025-06-02T14:00:00Z',
        },
        bookerPrincipal(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('saves a draft without confirming', async () => {
    const appt = await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: leasedDoor.id,
        activity: ActivityType.DROP,
        ...inHours,
        saveAsDraft: true,
      },
      bookerPrincipal(),
    );
    expect(appt.status).toBe(AppointmentStatus.DRAFT);
  });

  it('submits a draft and auto-confirms when free', async () => {
    const draft = await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: leasedDoor.id,
        activity: ActivityType.DROP,
        ...inHours,
        saveAsDraft: true,
      },
      bookerPrincipal(),
    );
    const submitted = await service.submit(draft.id, bookerPrincipal());
    expect(submitted.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('cancels an appointment and tags late_cancel inside 2 hours', async () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const soonEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const appt = await service.create(
      {
        siteId: site.id,
        tenantId,
        doorId: leasedDoor.id,
        activity: ActivityType.DROP,
        windowStart: soon.toISOString(),
        windowEnd: soonEnd.toISOString(),
        saveAsDraft: true,
      },
      bookerPrincipal(),
    );
    const cancelled = await service.cancel(appt.id, bookerPrincipal());
    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    expect(cancelled.statusReason).toBe('late_cancel');
  });
});
