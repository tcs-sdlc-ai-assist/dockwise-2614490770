/**
 * Unit tests for BoardService snapshot bucketing and card coloring.
 */
import { DataSource, Repository } from 'typeorm';
import { BoardService } from './board.service';
import { Appointment } from './appointment.entity';
import { AppointmentStatus, ActivityType } from './appointment.enums';
import { Door, DoorStatus, DoorType } from '../sites/door.entity';
import { Site } from '../sites/site.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('BoardService', () => {
  let dataSource: DataSource;
  let appointments: Repository<Appointment>;
  let doors: Repository<Door>;
  let sites: Repository<Site>;
  let service: BoardService;
  let site: Site;
  let door: Door;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    appointments = dataSource.getRepository(Appointment);
    doors = dataSource.getRepository(Door);
    sites = dataSource.getRepository(Site);
    service = new BoardService(appointments, doors);
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
      }),
    );
    door = await doors.save(
      doors.create({
        siteId: site.id,
        number: '11',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
      }),
    );
  });

  let codeCounter = 0;
  async function makeAppt(
    status: AppointmentStatus,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Appointment> {
    codeCounter += 1;
    return appointments.save(
      appointments.create({
        confirmationCode: `B${String(codeCounter).padStart(5, '0')}`,
        siteId: site.id,
        tenantId: 'tenant-1',
        doorId: door.id,
        activity: ActivityType.LIVE_UNLOAD,
        windowStart,
        windowEnd,
        status,
      }),
    );
  }

  it('buckets an upcoming confirmed appointment within 2 hours', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000); // 1h from now
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await makeAppt(AppointmentStatus.CONFIRMED, start, end);
    const snapshot = await service.snapshot(site.id);
    expect(snapshot.upcoming).toHaveLength(1);
    expect(snapshot.upcoming[0].doorNumber).toBe('11');
  });

  it('buckets an arrived appointment in the in-yard column', async () => {
    const start = new Date(Date.now() - 30 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    await makeAppt(AppointmentStatus.ARRIVED, start, end);
    const snapshot = await service.snapshot(site.id);
    expect(snapshot.inYard).toHaveLength(1);
  });

  it('buckets an at_door appointment in the at-door column', async () => {
    const start = new Date(Date.now() - 30 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    await makeAppt(AppointmentStatus.AT_DOOR, start, end);
    const snapshot = await service.snapshot(site.id);
    expect(snapshot.atDoor).toHaveLength(1);
  });

  it('colors a late in-yard card amber', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000); // started 1h ago
    const end = new Date(Date.now() + 60 * 60 * 1000);
    await makeAppt(AppointmentStatus.ARRIVED, start, end);
    const snapshot = await service.snapshot(site.id);
    expect(snapshot.inYard[0].color).toBe('amber');
    expect(snapshot.inYard[0].minutesVsWindow).toBeGreaterThan(15);
  });

  it('surfaces a confirmed appointment on an out-of-service door as a red exception', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const appt = await makeAppt(AppointmentStatus.CONFIRMED, start, end);
    door.status = DoorStatus.OUT_OF_SERVICE;
    await doors.save(door);
    const snapshot = await service.snapshot(site.id);
    expect(snapshot.exceptions.map((c) => c.appointmentId)).toContain(appt.id);
    expect(snapshot.exceptions[0].color).toBe('red');
  });

  it('colors a turned-away card purple and buckets it as an exception', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    await makeAppt(AppointmentStatus.TURNED_AWAY, start, end);
    const snapshot = await service.snapshot(site.id);
    expect(snapshot.exceptions[0].color).toBe('purple');
  });
});
