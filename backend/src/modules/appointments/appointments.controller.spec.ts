/**
 * API tests for the appointments controller against the real HTTP surface and
 * a real SQLite test database.
 *
 * Covers booking creation with auto-confirm, the no-double-booking 409, the
 * tenant-tampering 403, availability query, and confirmation-code format.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { Site } from '../sites/site.entity';
import { Door, DoorType } from '../sites/door.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Appointments (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let bookerToken: string;
  let siteId: string;
  let leasedDoorId: string;
  let tenantId: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    const seeded = await seedUserWithRole(
      dataSource,
      'booker@frostline.example',
      Role.TENANT_BOOKER,
      OrganizationType.TENANT,
      'Frostline',
    );
    tenantId = seeded.orgId;
    bookerToken = await ctx.tokenFor('booker@frostline.example');

    const site = await dataSource.getRepository(Site).save(
      dataSource.getRepository(Site).create({
        name: 'Dayton',
        address: 'A',
        timezone: 'America/New_York',
        operatorId: 'op-1',
        doorBufferMinutes: 10,
      }),
    );
    siteId = site.id;
    const door = await dataSource.getRepository(Door).save(
      dataSource.getRepository(Door).create({
        siteId,
        number: 'L1',
        type: DoorType.DOCK_HIGH,
        group: `leased:${tenantId}`,
      }),
    );
    leasedDoorId = door.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const inHours = {
    windowStart: '2025-06-02T12:00:00Z',
    windowEnd: '2025-06-02T13:30:00Z',
  };

  it('creates a leased in-hours booking that auto-confirms with a code', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({
        siteId,
        tenantId,
        doorId: leasedDoorId,
        activity: 'live unload',
        ...inHours,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.confirmationCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('returns 409 for a second overlapping confirmed booking', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({
        siteId,
        tenantId,
        doorId: leasedDoorId,
        activity: 'live load',
        windowStart: '2025-06-02T13:00:00Z',
        windowEnd: '2025-06-02T14:00:00Z',
      });
    expect(res.status).toBe(409);
  });

  it('returns 403 when a booker tampers with another tenant_id', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({
        siteId,
        tenantId: '00000000-0000-4000-8000-000000000099',
        doorId: leasedDoorId,
        activity: 'live unload',
        windowStart: '2025-06-03T12:00:00Z',
        windowEnd: '2025-06-03T13:00:00Z',
      });
    expect(res.status).toBe(403);
  });

  it('returns available slots for a site and day', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/appointments/availability')
      .query({ siteId, day: '2025-06-05', durationMinutes: 90 })
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('lists only the caller tenant appointments', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(200);
    for (const appt of res.body) {
      expect(appt.tenantId).toBe(tenantId);
    }
  });

  it('returns 401 without a token', async () => {
    const res = await request(ctx.app.getHttpServer()).get(
      '/api/v1/appointments',
    );
    expect(res.status).toBe(401);
  });
});
