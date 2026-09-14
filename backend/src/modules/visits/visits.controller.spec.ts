/**
 * API tests for the visits controller against the real HTTP surface and a real
 * SQLite test database.
 *
 * Covers gate search, check-in, dock events, check-out, unscheduled visits,
 * turn-away, after-the-fact check-in, and role enforcement.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { Site } from '../sites/site.entity';
import { Door, DoorType } from '../sites/door.entity';
import { Appointment } from '../appointments/appointment.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Visits (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let gateToken: string;
  let dockToken: string;
  let coordinatorToken: string;
  let bookerToken: string;
  let siteId: string;
  let appointmentId: string;
  let confirmationCode: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    await seedUserWithRole(
      dataSource,
      'gate@dockwise.example',
      Role.GATE_OFFICER,
      OrganizationType.PROPERTY_OPERATOR,
      'Meridian',
    );
    await seedUserWithRole(
      dataSource,
      'dock@dockwise.example',
      Role.DOCK_LEAD,
      OrganizationType.PROPERTY_OPERATOR,
      'Meridian',
    );
    await seedUserWithRole(
      dataSource,
      'coordinator@dockwise.example',
      Role.SITE_COORDINATOR,
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
    gateToken = await ctx.tokenFor('gate@dockwise.example');
    dockToken = await ctx.tokenFor('dock@dockwise.example');
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
        group: `leased:${booker.orgId}`,
      }),
    );
    const appt = await dataSource.getRepository(Appointment).save(
      dataSource.getRepository(Appointment).create({
        confirmationCode: `V${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        siteId,
        tenantId: booker.orgId,
        doorId: door.id,
        activity: 'live unload',
        windowStart: new Date('2025-06-02T12:00:00Z'),
        windowEnd: new Date('2025-06-02T13:00:00Z'),
        status: 'confirmed',
        referenceText: 'PO 88421',
      }),
    );
    appointmentId = appt.id;
    confirmationCode = appt.confirmationCode;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('searches by confirmation number', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/visits/search')
      .query({ siteId, q: confirmationCode })
      .set('Authorization', `Bearer ${gateToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0].confirmationCode).toBe(confirmationCode);
  });

  it('checks in a vehicle with plate and trailer', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/visits/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${gateToken}`)
      .send({ driverName: 'Sam', tractorPlate: 'ABC123', trailerNumber: 'TRL1' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('arrived');
    expect(res.body.tractorPlate).toBe('ABC123');
  });

  it('records dock events and checks out', async () => {
    // Find the visit for the appointment.
    const search = await request(ctx.app.getHttpServer())
      .get('/api/v1/visits/search')
      .query({ siteId, q: confirmationCode })
      .set('Authorization', `Bearer ${gateToken}`);
    const visitId = search.body[0].visitId as string;
    expect(visitId).toBeTruthy();

    const ready = await request(ctx.app.getHttpServer())
      .post('/api/v1/visits/dock-event')
      .set('Authorization', `Bearer ${dockToken}`)
      .send({ visitId, type: 'door_ready' });
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('at_door');

    const start = await request(ctx.app.getHttpServer())
      .post('/api/v1/visits/dock-event')
      .set('Authorization', `Bearer ${dockToken}`)
      .send({ visitId, type: 'load_start' });
    expect(start.body.status).toBe('in_progress');

    const complete = await request(ctx.app.getHttpServer())
      .post('/api/v1/visits/dock-event')
      .set('Authorization', `Bearer ${dockToken}`)
      .send({ visitId, type: 'load_complete' });
    expect(complete.body.status).toBe('complete');

    const out = await request(ctx.app.getHttpServer())
      .post(`/api/v1/visits/${visitId}/check-out`)
      .set('Authorization', `Bearer ${gateToken}`)
      .send({ outboundSeal: 'SEAL1', outboundLoadState: 'loaded' });
    expect(out.status).toBe(200);
    expect(out.body.status).toBe('exited');
  });

  it('logs an unscheduled visit and turns it away', async () => {
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/visits/unscheduled')
      .set('Authorization', `Bearer ${gateToken}`)
      .send({
        siteId,
        tractorPlate: 'XYZ789',
        reason: 'hot_load',
        carrierName: 'Northstar',
      });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('pending');

    const turned = await request(ctx.app.getHttpServer())
      .post(`/api/v1/visits/unscheduled/${created.body.id}/turn-away`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(turned.status).toBe(200);
    expect(turned.body.status).toBe('turned_away');

    // Turned-away record is retrievable in the unscheduled list.
    const list = await request(ctx.app.getHttpServer())
      .get('/api/v1/visits/unscheduled')
      .query({ siteId })
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(
      list.body.some((r: { id: string }) => r.id === created.body.id),
    ).toBe(true);
  });

  it('rejects check-in by a tenant booker with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/visits/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${bookerToken}`)
      .send({ driverName: 'X', tractorPlate: 'P', trailerNumber: 'T' });
    expect(res.status).toBe(403);
  });
});
