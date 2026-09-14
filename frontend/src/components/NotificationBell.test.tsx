/**
 * Unit tests for the NotificationBell component.
 *
 * Covers the unread count badge, the dropdown list, and marking a notification
 * read.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationBell } from './NotificationBell';
import * as notificationsApi from '../api/notifications';

vi.mock('../api/notifications');

function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the unread count badge', async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(3);
    renderBell();
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('lists notifications when opened and marks one read', async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(1);
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue([
      {
        id: 'n1',
        userId: 'u1',
        channel: 'in_app',
        title: 'Appointment confirmed',
        body: 'DW7K4Q2M is confirmed.',
        read: false,
        relatedId: 'a1',
        createdAt: '',
      },
    ]);
    const readMock = vi
      .mocked(notificationsApi.markNotificationRead)
      .mockResolvedValue(undefined);
    renderBell();
    await screen.findByText('1');
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i }),
    );
    expect(await screen.findByText('Appointment confirmed')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Appointment confirmed'));
    await waitFor(() => expect(readMock).toHaveBeenCalledWith('n1', expect.anything()));
  });

  it('shows the empty state when there are no notifications', async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(0);
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue([]);
    renderBell();
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i }),
    );
    expect(await screen.findByText(/no notifications/i)).toBeInTheDocument();
  });
});
