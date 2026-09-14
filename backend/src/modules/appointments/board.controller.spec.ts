/**
 * API tests for the live board controller against the real HTTP surface and a
 * real SQLite test database.
 *
 * Covers the snapshot buckets, card fields, and role enforcement.
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

describe('Board (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let bookerToken: string;
  let siteId: string;
  let doorId: string;

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
      }),
    );
    siteId = site.id;
    const door = await dataSource.getRepository(Door).save(
      dataSource.getRepository(Door).create({
        siteId,
        number: '11',
        type: DoorType.DOCK_HIGH,
        group: 'pool',
      }),
    );
    doorId = door.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('returns the four board buckets', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await dataSource.getRepository(Appointment).save(
      dataSource.getRepository(Appointment).create({
        confirmationCode: `BRD${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        siteId,
        tenantId: 'tenant-1',
        doorId,
        activity: 'live unload',
        windowStart: start,
        windowEnd: end,
        status: 'confirmed',
      }),
    );

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/board/${siteId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('upcoming');
    expect(res.body).toHaveProperty('inYard');
    expect(res.body).toHaveProperty('atDoor');
    expect(res.body).toHaveProperty('exceptions');
    expect(res.body.upcoming[0].doorNumber).toBe('11');
    expect(res.body.upcoming[0].status).toBe('confirmed');
  });

  it('rejects board access by a tenant booker with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/board/${siteId}`)
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(403);
  });
});
