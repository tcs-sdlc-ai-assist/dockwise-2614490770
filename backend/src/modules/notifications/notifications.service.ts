/**
 * Notifications service: in-app bell notifications and lifecycle fan-out.
 *
 * Creates in-app notifications for affected parties and coordinates email/SMS
 * outbox writes per the notification matrix (confirmation, counter,
 * cancellation, arrival, unscheduled arrival, reassignment, template conflict,
 * invite).
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel } from './notification.entity';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  /**
   * Create an in-app bell notification for a user.
   *
   * Args:
   *   userId: The recipient user id.
   *   title: The short title.
   *   body: The body text.
   *   relatedId: The related appointment/visit id, when applicable.
   *
   * Returns:
   *   The created notification.
   */
  async notifyInApp(
    userId: string,
    title: string,
    body: string,
    relatedId?: string,
  ): Promise<Notification> {
    const notification = this.notifications.create({
      userId,
      channel: NotificationChannel.IN_APP,
      title,
      body,
      read: false,
      relatedId: relatedId ?? null,
    });
    return this.notifications.save(notification);
  }

  /**
   * Notify affected parties of an appointment confirmation.
   *
   * Sends an in-app bell notification and an email; sends opt-in SMS.
   *
   * Args:
   *   userIds: The recipient user ids (tenant booker and carrier).
   *   confirmationCode: The appointment confirmation code.
   *   appointmentId: The appointment id.
   *   smsRecipients: Opt-in US mobile numbers.
   *   emailRecipients: Recipient email addresses.
   */
  async notifyConfirmation(
    userIds: string[],
    confirmationCode: string,
    appointmentId: string,
    smsRecipients: string[] = [],
    emailRecipients: string[] = [],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.notifyInApp(
        userId,
        'Appointment confirmed',
        `Appointment ${confirmationCode} is confirmed.`,
        appointmentId,
      );
    }
    for (const email of emailRecipients) {
      await this.email.send(
        email,
        'Appointment confirmed',
        `Appointment ${confirmationCode} is confirmed.`,
        appointmentId,
      );
    }
    for (const phone of smsRecipients) {
      await this.sms.send(
        phone,
        `Dockwise: appointment ${confirmationCode} confirmed.`,
        appointmentId,
      );
    }
  }

  /**
   * Notify affected parties of a cancellation.
   *
   * Args:
   *   userIds: The recipient user ids.
   *   confirmationCode: The appointment confirmation code.
   *   appointmentId: The appointment id.
   *   emailRecipients: Recipient email addresses.
   */
  async notifyCancellation(
    userIds: string[],
    confirmationCode: string,
    appointmentId: string,
    emailRecipients: string[] = [],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.notifyInApp(
        userId,
        'Appointment cancelled',
        `Appointment ${confirmationCode} was cancelled.`,
        appointmentId,
      );
    }
    for (const email of emailRecipients) {
      await this.email.send(
        email,
        'Appointment cancelled',
        `Appointment ${confirmationCode} was cancelled.`,
        appointmentId,
      );
    }
  }

  /**
   * Notify a tenant booker of a truck arrival.
   *
   * Args:
   *   userId: The tenant booker's user id.
   *   confirmationCode: The appointment confirmation code.
   *   visitId: The visit id.
   */
  async notifyArrival(
    userId: string,
    confirmationCode: string,
    visitId: string,
  ): Promise<void> {
    await this.notifyInApp(
      userId,
      'Truck arrived',
      `Truck for ${confirmationCode} checked in at the gate.`,
      visitId,
    );
  }

  /**
   * List a user's in-app notifications.
   *
   * Args:
   *   userId: The user id.
   *
   * Returns:
   *   The user's notifications, newest first.
   */
  async listForUser(userId: string): Promise<Notification[]> {
    return this.notifications.find({
      where: { userId, channel: NotificationChannel.IN_APP },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Mark a notification read.
   *
   * Args:
   *   id: The notification id.
   *   userId: The owning user id.
   *
   * Returns:
   *   The updated notification, or null when not found.
   */
  async markRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.notifications.findOne({
      where: { id, userId },
    });
    if (!notification) {
      return null;
    }
    notification.read = true;
    return this.notifications.save(notification);
  }

  /**
   * Count a user's unread in-app notifications.
   *
   * Args:
   *   userId: The user id.
   *
   * Returns:
   *   The unread count.
   */
  async unreadCount(userId: string): Promise<number> {
    return this.notifications.count({
      where: { userId, channel: NotificationChannel.IN_APP, read: false },
    });
  }
}
