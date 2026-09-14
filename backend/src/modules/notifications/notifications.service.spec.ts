/**
 * Unit tests for NotificationsService, EmailService, and SmsService.
 *
 * Covers in-app bell creation, the confirmation/cancellation/arrival fan-out,
 * email/SMS outbox logging with delivery state, and per-user scoping.
 */
import { DataSource, Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { Notification, NotificationChannel } from './notification.entity';
import {
  DeliveryState,
  NotificationOutbox,
  OutboxKind,
} from './notification-outbox.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('Notifications', () => {
  let dataSource: DataSource;
  let notifications: Repository<Notification>;
  let outbox: Repository<NotificationOutbox>;
  let service: NotificationsService;
  let email: EmailService;
  let sms: SmsService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    notifications = dataSource.getRepository(Notification);
    outbox = dataSource.getRepository(NotificationOutbox);
    email = new EmailService(outbox);
    sms = new SmsService(outbox);
    service = new NotificationsService(notifications, email, sms);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await notifications.clear();
    await outbox.clear();
  });

  it('creates an in-app bell notification', async () => {
    const n = await service.notifyInApp('u1', 'Title', 'Body', 'appt-1');
    expect(n.channel).toBe(NotificationChannel.IN_APP);
    expect(n.read).toBe(false);
  });

  it('fans out a confirmation to in-app, email, and SMS', async () => {
    await service.notifyConfirmation(
      ['u1', 'u2'],
      'DW7K4Q2M',
      'appt-1',
      ['+15551234567'],
      ['booker@frostline.example'],
    );
    const inApp = await notifications.find();
    expect(inApp).toHaveLength(2);
    const outboxRows = await outbox.find();
    expect(outboxRows.some((r) => r.kind === OutboxKind.EMAIL)).toBe(true);
    expect(outboxRows.some((r) => r.kind === OutboxKind.SMS)).toBe(true);
    expect(
      outboxRows.every((r) => r.deliveryState === DeliveryState.SENT),
    ).toBe(true);
  });

  it('logs a cancellation to in-app and email', async () => {
    await service.notifyCancellation(
      ['u1'],
      'DW7K4Q2M',
      'appt-1',
      ['booker@frostline.example'],
    );
    const inApp = await notifications.find();
    expect(inApp).toHaveLength(1);
    expect(inApp[0].title).toBe('Appointment cancelled');
  });

  it('lists only the caller notifications and counts unread', async () => {
    await service.notifyInApp('u1', 'A', 'a');
    await service.notifyInApp('u1', 'B', 'b');
    await service.notifyInApp('u2', 'C', 'c');
    const list = await service.listForUser('u1');
    expect(list).toHaveLength(2);
    expect(await service.unreadCount('u1')).toBe(2);
  });

  it('marks a notification read', async () => {
    const n = await service.notifyInApp('u1', 'A', 'a');
    const updated = await service.markRead(n.id, 'u1');
    expect(updated?.read).toBe(true);
    expect(await service.unreadCount('u1')).toBe(0);
  });

  it('SMS delivery failure does not throw into the caller', async () => {
    // Force a failure by destroying the outbox repository connection.
    await dataSource.destroy();
    const result = await sms.send('+15551234567', 'test');
    expect(result).toBeNull();
    // Re-initialize for other tests.
    dataSource = await newTestDataSource();
    notifications = dataSource.getRepository(Notification);
    outbox = dataSource.getRepository(NotificationOutbox);
    email = new EmailService(outbox);
    sms = new SmsService(outbox);
    service = new NotificationsService(notifications, email, sms);
  });
});
