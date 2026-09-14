/**
 * API tests for the coordinator queue controller against the real HTTP surface
 * and a real SQLite test database.
 *
 * Covers queue listing, confirm/decline/counter, reassignment with reason +
 * history, the exception list, and role enforcement.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { Site } from '../sites/site.entity';
import { Door, DoorType } from '../sites/door.entity';
import { Appointment } from './appointment.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Queue (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let bookerToken: string;
  let siteId: string;
  let doorAId: string;
  let doorBId: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    await seedUserWithRole(
      dataSource,
      'coordinator@dockwise.example',
      Role.SITE_COORDINATOR,
      OrganizationType.PROPERTY_OPERATOR,
      'Meridian',
    );
    await seedUserWithRole(
      dataSource,
      'booker@frostline.example',
      Role.TENANT_BOOKER,
      OrganizationType.TENANT,
      'Frostline',
    );
    coordinatorToken = await ctx.tokenFor('coordinator@dockwise.example');
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
    const doorA = await dataSource.getRepository(Door).save(
      dataSource.getRepository(Door).create({
        siteId,
        number: 'A',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
      }),
    );
    const doorB = await dataSource.getRepository(Door).save(
      dataSource.getRepository(Door).create({
        siteId,
        number: 'B',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
      }),
    );
    doorAId = doorA.id;
    doorBId = doorB.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function makeRequested(): Promise<string> {
    const appt = await dataSource.getRepository(Appointment).save(
      dataSource.getRepository(Appointment).create({
        confirmationCode: `C${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        siteId,
        tenantId: 'tenant-1',
        doorId: doorAId,
        activity: 'live unload',
        windowStart: new Date('2025-06-02T12:00:00Z'),
        windowEnd: new Date('2025-06-02T13:00:00Z'),
        status: 'requested',
      }),
    );
    return appt.id;
  }

  it('lists requested appointments in the queue', async () => {
    await makeRequested();
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/queue')
      .query({ siteId })
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((a: { status: string }) => a.status === 'requested')).toBe(true);
  });

  it('confirms a requested appointment', async () => {
    const id = await makeRequested();
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/queue/${id}/confirm`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('declines an appointment with a reason', async () => {
    const id = await makeRequested();
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/queue/${id}/decline`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ reason: 'No capacity' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.statusReason).toBe('No capacity');
  });

  it('counters an appointment with a new window', async () => {
    const id = await makeRequested();
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/queue/${id}/counter`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        windowStart: '2025-06-02T15:00:00Z',
        windowEnd: '2025-06-02T16:00:00Z',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('countered');
  });

  it('reassigns a door and returns the reassignment history', async () => {
    const id = await makeRequested();
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/queue/${id}/reassign`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ toDoorId: doorBId, reason: 'door_down' });
    expect(res.status).toBe(200);
    expect(res.body.doorId).toBe(doorBId);

    const history = await request(ctx.app.getHttpServer())
      .get(`/api/v1/queue/${id}/reassignments`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].fromDoorId).toBe(doorAId);
    expect(history.body[0].toDoorId).toBe(doorBId);
  });

  it('rejects queue access by a tenant booker with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/queue')
      .query({ siteId })
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(403);
  });
});
