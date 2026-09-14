/**
 * Notifications module: registers notification and outbox persistence and the
 * notification/email/SMS services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationOutbox } from './notification-outbox.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationOutbox])],
  providers: [NotificationsService, EmailService, SmsService],
  controllers: [NotificationsController],
  exports: [NotificationsService, EmailService, SmsService, TypeOrmModule],
})
export class NotificationsModule {}
