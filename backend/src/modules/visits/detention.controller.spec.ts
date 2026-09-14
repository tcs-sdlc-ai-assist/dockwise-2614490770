/**
 * API tests for the detention controller against the real HTTP surface and a
 * real SQLite test database.
 *
 * Covers the estimate endpoint, the coordinator-only pause endpoint, the
 * tenant-cannot-pause 403, and the display-only disclaimer.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { Site } from '../sites/site.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Visit } from './visit.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Detention (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let tenantToken: string;
  let visitId: string;

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
    const tenant = await seedUserWithRole(
      dataSource,
      'tenant.admin@frostline.example',
      Role.TENANT_ADMIN,
      OrganizationType.TENANT,
      'Frostline',
    );
    coordinatorToken = await ctx.tokenFor('coordinator@dockwise.example');
    tenantToken = await ctx.tokenFor('tenant.admin@frostline.example');

    const site = await dataSource.getRepository(Site).save(
      dataSource.getRepository(Site).create({
        name: 'Dayton',
        address: 'A',
        timezone: 'America/New_York',
        operatorId: 'op-1',
      }),
    );
    const appt = await dataSource.getRepository(Appointment).save(
      dataSource.getRepository(Appointment).create({
        confirmationCode: `D${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        siteId: site.id,
        tenantId: tenant.orgId,
        activity: 'live unload',
        windowStart: new Date('2025-06-02T12:00:00Z'),
        windowEnd: new Date('2025-06-02T13:00:00Z'),
        status: 'confirmed',
      }),
    );
    const visit = await dataSource.getRepository(Visit).save(
      dataSource.getRepository(Visit).create({
        siteId: site.id,
        appointmentId: appt.id,
        tenantId: tenant.orgId,
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL1',
        status: 'complete',
        arrivedAt: new Date('2025-06-02T12:00:00Z'),
        loadCompleteAt: new Date('2025-06-02T16:00:00Z'),
      }),
    );
    visitId = visit.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('returns the detention estimate with the disclaimer', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/visits/${visitId}/detention`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.billableMinutes).toBe(120);
    expect(res.body.disclaimer).toBe('Not an invoice. For discussion only.');
  });

  it('lets a coordinator pause detention, reducing billable minutes', async () => {
    const pause = await request(ctx.app.getHttpServer())
      .post(`/api/v1/visits/${visitId}/detention/pause`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        reason: 'site_fault',
        detail: 'No forklift',
        startAt: '2025-06-02T13:00:00Z',
        endAt: '2025-06-02T14:00:00Z',
      });
    expect(pause.status).toBe(201);

    const est = await request(ctx.app.getHttpServer())
      .get(`/api/v1/visits/${visitId}/detention`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(est.body.pausedMinutes).toBe(60);
    expect(est.body.billableMinutes).toBe(60);
  });

  it('forbids a tenant from pausing its own clock with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/visits/${visitId}/detention/pause`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        reason: 'site_fault',
        startAt: '2025-06-02T13:00:00Z',
        endAt: '2025-06-02T13:30:00Z',
      });
    expect(res.status).toBe(403);
  });
});
