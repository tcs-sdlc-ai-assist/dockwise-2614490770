/**
 * Notifications API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** An in-app notification. */
export interface AppNotification {
  id: string;
  userId: string;
  channel: string;
  title: string;
  body: string;
  read: boolean;
  relatedId: string | null;
  createdAt: string;
}

/** List the caller's in-app notifications. */
export async function listNotifications(): Promise<AppNotification[]> {
  const res = await apiClient.get<AppNotification[]>('/api/v1/notifications');
  return res.data;
}

/** Get the caller's unread notification count. */
export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ count: number }>(
    '/api/v1/notifications/unread-count',
  );
  return res.data.count;
}

/** Mark a notification read. */
export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/api/v1/notifications/${id}/read`);
}
