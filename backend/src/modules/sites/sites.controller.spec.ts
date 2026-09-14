/**
 * API tests for the sites and doors controllers against the real HTTP surface
 * and a real SQLite test database.
 *
 * Covers site creation authorization, listing, door creation, duplicate
 * conflict, CSV import, and out-of-service transitions.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Sites & Doors (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let adminToken: string;
  let bookerToken: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    await seedUserWithRole(
      dataSource,
      'admin@dockwise.example',
      Role.PLATFORM_ADMIN,
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
    adminToken = await ctx.tokenFor('admin@dockwise.example');
    bookerToken = await ctx.tokenFor('booker@frostline.example');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('creates a site as platform admin and returns 201', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dayton DC-03',
        address: '1 Dock Way',
        timezone: 'America/New_York',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.status).toBe('shadow');
  });

  it('rejects site creation by a tenant booker with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({ name: 'X', address: 'Y', timezone: 'America/New_York' });
    expect(res.status).toBe(403);
  });

  it('lists sites for an authenticated caller', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('creates a door and rejects a duplicate number with 409', async () => {
    const site = await request(ctx.app.getHttpServer())
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Door Site', address: 'A', timezone: 'America/New_York' });
    const siteId = site.body.id as string;

    const created = await request(ctx.app.getHttpServer())
      .post(`/api/v1/sites/${siteId}/doors`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: '11', type: 'dock-high' });
    expect(created.status).toBe(201);

    const dup = await request(ctx.app.getHttpServer())
      .post(`/api/v1/sites/${siteId}/doors`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: '11', type: 'dock-high' });
    expect(dup.status).toBe(409);
  });

  it('imports doors from CSV rows and reports skipped duplicates', async () => {
    const site = await request(ctx.app.getHttpServer())
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Import Site', address: 'A', timezone: 'America/New_York' });
    const siteId = site.body.id as string;

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/sites/${siteId}/doors/import`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        doors: [
          { number: '1', type: 'dock-high' },
          { number: '2', type: 'grade-level' },
          { number: '1', type: 'dock-high' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.created).toHaveLength(2);
    expect(res.body.skipped).toBe(1);
  });

  it('marks a door out of service with a note', async () => {
    const site = await request(ctx.app.getHttpServer())
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'OOS Site', address: 'A', timezone: 'America/New_York' });
    const siteId = site.body.id as string;
    const door = await request(ctx.app.getHttpServer())
      .post(`/api/v1/sites/${siteId}/doors`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: '7', type: 'dock-high' });
    const doorId = door.body.id as string;

    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/doors/${doorId}/out-of-service`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Door spring broken' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('out_of_service');
    expect(res.body.statusNote).toBe('Door spring broken');
  });
});
