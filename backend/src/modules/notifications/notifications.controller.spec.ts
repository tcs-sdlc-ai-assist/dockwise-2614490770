/**
 * API tests for the notifications controller against the real HTTP surface and
 * a real SQLite test database.
 *
 * Covers listing the caller's notifications, the unread count, marking read,
 * and per-user scoping.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../organizations/membership.entity';
import { OrganizationType } from '../organizations/organization.entity';
import { Notification, NotificationChannel } from './notification.entity';
import {
  buildTestApp,
  seedUserWithRole,
  TestContext,
} from '../../test-utils/api-test-app';

describe('Notifications (API)', () => {
  let ctx: TestContext;
  let dataSource: DataSource;
  let bookerToken: string;
  let bookerId: string;
  let otherToken: string;

  beforeAll(async () => {
    ctx = await buildTestApp();
    dataSource = ctx.dataSource;
    const booker = await seedUserWithRole(
      dataSource,
      'booker@frostline.example',
      Role.TENANT_BOOKER,
      OrganizationType.TENANT,
      'Frostline',
    );
    const other = await seedUserWithRole(
      dataSource,
      'coordinator@dockwise.example',
      Role.SITE_COORDINATOR,
      OrganizationType.PROPERTY_OPERATOR,
      'Meridian',
    );
    bookerId = booker.userId;
    bookerToken = await ctx.tokenFor('booker@frostline.example');
    otherToken = await ctx.tokenFor('coordinator@dockwise.example');

    // Seed notifications for the booker.
    const notifications = dataSource.getRepository(Notification);
    await notifications.save([
      notifications.create({
        userId: bookerId,
        channel: NotificationChannel.IN_APP,
        title: 'Appointment confirmed',
        body: 'DW7K4Q2M confirmed.',
        read: false,
      }),
      notifications.create({
        userId: bookerId,
        channel: NotificationChannel.IN_APP,
        title: 'Truck arrived',
        body: 'Truck arrived.',
        read: false,
      }),
    ]);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lists only the caller notifications', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const n of res.body) {
      expect(n.userId).toBe(bookerId);
    }
  });

  it('returns the unread count', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('marks a notification read', async () => {
    const list = await request(ctx.app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${bookerToken}`);
    const id = list.body[0].id as string;
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/notifications/${id}/read`)
      .set('Authorization', `Bearer ${bookerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
  });

  it('returns zero unread for a user with none', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('returns 401 without a token', async () => {
    const res = await request(ctx.app.getHttpServer()).get(
      '/api/v1/notifications',
    );
    expect(res.status).toBe(401);
  });
});
