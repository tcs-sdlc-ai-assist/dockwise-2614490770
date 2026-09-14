/**
 * Unit tests for VisitsService search scoping.
 *
 * Covers search by confirmation number and plate, and tenant/carrier scoping
 * (tenants see only their visits; carriers see only their loads).
 */
import { DataSource, Repository } from 'typeorm';
import { VisitsService } from './visits.service';
import { Visit } from './visit.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus, ActivityType } from '../appointments/appointment.enums';
import { Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';
import { makePrincipal } from '../../test-utils/make-principal';

describe('VisitsService search', () => {
  let dataSource: DataSource;
  let visits: Repository<Visit>;
  let appointments: Repository<Appointment>;
  let service: VisitsService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    visits = dataSource.getRepository(Visit);
    appointments = dataSource.getRepository(Appointment);
    service = new VisitsService(visits, appointments);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await visits.clear();
    await appointments.clear();
    await appointments.save([
      appointments.create({
        confirmationCode: 'AAAA1111',
        siteId: 'site-1',
        tenantId: 'tenant-a',
        carrierId: 'carrier-1',
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: new Date('2025-06-02T12:00:00Z'),
        windowEnd: new Date('2025-06-02T13:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        tractorPlate: 'PLATE-A',
        referenceText: 'PO 88421',
      }),
      appointments.create({
        confirmationCode: 'BBBB2222',
        siteId: 'site-1',
        tenantId: 'tenant-b',
        carrierId: 'carrier-2',
        activity: ActivityType.LIVE_LOAD,
        windowStart: new Date('2025-06-02T14:00:00Z'),
        windowEnd: new Date('2025-06-02T15:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        tractorPlate: 'PLATE-B',
        referenceText: 'PO 99999',
      }),
    ]);
  });

  it('finds an appointment by confirmation number', async () => {
    const results = await service.search(
      'site-1',
      'AAAA1111',
      makePrincipal(Role.GATE_OFFICER),
    );
    expect(results).toHaveLength(1);
    expect(results[0].confirmationCode).toBe('AAAA1111');
  });

  it('finds an appointment by plate', async () => {
    const results = await service.search(
      'site-1',
      'PLATE-B',
      makePrincipal(Role.GATE_OFFICER),
    );
    expect(results).toHaveLength(1);
    expect(results[0].confirmationCode).toBe('BBBB2222');
  });

  it('finds an appointment by PO reference', async () => {
    const results = await service.search(
      'site-1',
      '88421',
      makePrincipal(Role.GATE_OFFICER),
    );
    expect(results).toHaveLength(1);
    expect(results[0].confirmationCode).toBe('AAAA1111');
  });

  it('scopes a tenant to only its own appointments', async () => {
    const results = await service.search(
      'site-1',
      'PO',
      makePrincipal(Role.TENANT_BOOKER, 'tenant', 'tenant-a'),
    );
    expect(results).toHaveLength(1);
    expect(results[0].tenantId).toBe('tenant-a');
  });

  it('scopes a carrier to only its loads', async () => {
    const results = await service.search(
      'site-1',
      'PO',
      makePrincipal(Role.CARRIER_DISPATCHER, 'carrier', 'carrier-2'),
    );
    expect(results).toHaveLength(1);
    expect(results[0].confirmationCode).toBe('BBBB2222');
  });
});
