/**
 * Notification bell: an in-app notification indicator with a dropdown list.
 *
 * Shows the unread count and lists recent notifications; clicking one marks it
 * read.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
} from '../api/notifications';

/**
 * Render the notification bell.
 *
 * Returns:
 *   The notification bell element.
 */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const countQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    refetchInterval: 15000,
  });
  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    enabled: open,
  });

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const unread = countQuery.data ?? 0;

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="btn btn-secondary bell-button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>

      {open && (
        <div className="bell-dropdown" role="region" aria-label="Notifications">
          {listQuery.isLoading && <p className="muted">Loading…</p>}
          {listQuery.data?.length === 0 && (
            <p className="muted">No notifications.</p>
          )}
          <ul className="bell-list">
            {listQuery.data?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`bell-item ${n.read ? 'bell-item-read' : ''}`}
                  onClick={() => readMutation.mutate(n.id)}
                >
                  <span className="bell-item-title">{n.title}</span>
                  <span className="muted bell-item-body">{n.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
