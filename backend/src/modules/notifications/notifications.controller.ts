/**
 * Notifications controller: the in-app bell endpoints.
 */
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthPrincipal } from '../auth/auth.service';

@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * List the caller's in-app notifications.
   *
   * Args:
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The caller's notifications, newest first.
   */
  @Get()
  list(@CurrentUser() principal: AuthPrincipal): Promise<Notification[]> {
    return this.notifications.listForUser(principal.userId);
  }

  /**
   * Get the caller's unread notification count.
   *
   * Args:
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The unread count.
   */
  @Get('unread-count')
  async unreadCount(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ count: number }> {
    const count = await this.notifications.unreadCount(principal.userId);
    return { count };
  }

  /**
   * Mark a notification read.
   *
   * Args:
   *   id: The notification id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The updated notification.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('id') id: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Notification | null> {
    return this.notifications.markRead(id, principal.userId);
  }
}
