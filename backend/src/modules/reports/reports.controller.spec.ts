/**
 * API tests for the reports controller against the real HTTP surface and a
 * real SQLite test database.
 *
 * Covers search, CSV export, the visit PDF, the dashboard, and tenant scoping.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { Site } from '../sites/site.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Visit } from '../visits/visit.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Reports (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let adminToken: string;
  let tenantToken: string;
  let siteId: string;
  let visitId: string;
  let tenantAId: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    await seedUserWithRole(
      dataSource,
      'site.admin@dockwise.example',
      Role.SITE_ADMIN,
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
    tenantAId = tenant.orgId;
    adminToken = await ctx.tokenFor('site.admin@dockwise.example');
    tenantToken = await ctx.tokenFor('tenant.admin@frostline.example');

    const site = await dataSource.getRepository(Site).save(
      dataSource.getRepository(Site).create({
        name: 'Dayton',
        address: 'A',
        timezone: 'America/New_York',
        operatorId: 'op-1',
      }),
    );
    siteId = site.id;

    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const appt = await dataSource.getRepository(Appointment).save(
      dataSource.getRepository(Appointment).create({
        confirmationCode: `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        siteId,
        tenantId: tenantAId,
        carrierName: 'Northstar',
        activity: 'live unload',
        windowStart: recent,
        windowEnd: new Date(recent.getTime() + 3600000),
        status: 'complete',
        referenceText: 'PO 88421',
      }),
    );
    const visit = await dataSource.getRepository(Visit).save(
      dataSource.getRepository(Visit).create({
        siteId,
        appointmentId: appt.id,
        tenantId: tenantAId,
        driverName: 'Sam Driver',
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL456',
        status: 'exited',
        arrivedAt: recent,
        loadCompleteAt: new Date(recent.getTime() + 90 * 60000),
        exitedAt: new Date(recent.getTime() + 120 * 60000),
      }),
    );
    visitId = visit.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('searches by PO', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/search')
      .query({ siteId, po: '88421' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].driverName).toBe('Sam Driver');
  });

  it('exports CSV with driver name and plates', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/export.csv')
      .query({ siteId, po: '88421' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Sam Driver');
    expect(res.text).toContain('ABC123');
  });

  it('returns a one-visit PDF', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/reports/visits/${visitId}.pdf`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.toString('latin1')).toContain('%PDF-1.4');
  });

  it('returns dashboard metrics', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/dashboard')
      .query({ siteId })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('byStatus30d');
    expect(res.body).toHaveProperty('onTimePercent');
    expect(res.body).toHaveProperty('avgDwellMinutes');
  });

  it('scopes a tenant to only its own rows', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/search')
      .query({ siteId })
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    for (const row of res.body) {
      expect(row.tenantId).toBe(tenantAId);
    }
  });

  it('filters by plate, status, and confirmation code', async () => {
    const byPlate = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/search')
      .query({ siteId, plate: 'ABC123' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byPlate.status).toBe(200);
    expect(byPlate.body.length).toBeGreaterThan(0);

    const byStatus = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/search')
      .query({ siteId, status: 'complete' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byStatus.status).toBe(200);
    for (const row of byStatus.body) {
      expect(row.status).toBe('complete');
    }

    const code = byPlate.body[0].confirmationCode as string;
    const byCode = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/search')
      .query({ siteId, confirmationCode: code })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byCode.status).toBe(200);
    expect(byCode.body[0].confirmationCode).toBe(code);
  });

  it('filters by carrierId', async () => {
    // The seeded appointment has carrierName 'Northstar' but no carrierId; add
    // one with a carrierId to filter on.
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await dataSource.getRepository(Appointment).save(
      dataSource.getRepository(Appointment).create({
        confirmationCode: `C${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        siteId,
        tenantId: tenantAId,
        carrierId: 'carrier-xyz',
        activity: 'live load',
        windowStart: recent,
        windowEnd: new Date(recent.getTime() + 3600000),
        status: 'confirmed',
      }),
    );
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/reports/search')
      .query({ siteId, carrierId: 'carrier-xyz' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const row of res.body) {
      expect(row.carrierId).toBe('carrier-xyz');
    }
  });
});
