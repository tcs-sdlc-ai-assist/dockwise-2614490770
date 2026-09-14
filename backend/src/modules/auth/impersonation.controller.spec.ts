/**
 * API tests for the impersonation controller against the real HTTP surface and
 * a real SQLite test database.
 *
 * Covers starting an impersonation session (platform admin only) and role
 * enforcement.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Impersonation (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let adminToken: string;
  let bookerToken: string;
  let targetUserId: string;

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
    const booker = await seedUserWithRole(
      dataSource,
      'booker@frostline.example',
      Role.TENANT_BOOKER,
      OrganizationType.TENANT,
      'Frostline',
    );
    adminToken = await ctx.tokenFor('platform.admin@dockwise.example');
    bookerToken = await ctx.tokenFor('booker@frostline.example');
    targetUserId = booker.userId;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('starts an impersonation session as platform admin', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/impersonation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserId });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.impersonatedBy).toBeTruthy();
  });

  it('rejects impersonation by a non-platform-admin with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/impersonation')
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({ targetUserId });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a missing target user', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/impersonation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserId: '00000000-0000-4000-8000-000000000099' });
    expect(res.status).toBe(404);
  });
});
