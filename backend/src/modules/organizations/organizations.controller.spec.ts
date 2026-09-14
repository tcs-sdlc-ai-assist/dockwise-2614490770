/**
 * API tests for the organizations controller against the real HTTP surface and
 * a real SQLite test database.
 *
 * Covers organization creation (platform admin only), listing, and role
 * enforcement.
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

describe('Organizations (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let adminToken: string;
  let bookerToken: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    await seedUserWithRole(
      dataSource,
      'platform.admin@dockwise.example',
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
    adminToken = await ctx.tokenFor('platform.admin@dockwise.example');
    bookerToken = await ctx.tokenFor('booker@frostline.example');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('creates an organization as platform admin and returns 201', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Tenant Co', type: 'tenant', contactEmail: 'x@t.example' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Tenant Co');
  });

  it('rejects organization creation by a tenant booker with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({ name: 'Nope', type: 'tenant' });
    expect(res.status).toBe(403);
  });

  it('lists organizations for an authenticated caller', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 400 for an invalid organization type', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', type: 'not-a-type' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(ctx.app.getHttpServer()).get(
      '/api/v1/organizations',
    );
    expect(res.status).toBe(401);
  });
});
