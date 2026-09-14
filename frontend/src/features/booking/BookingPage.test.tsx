/**
 * Unit tests for the BookingPage component.
 *
 * Covers the site selector, slot rendering/selection, and the successful
 * booking flow showing a confirmation code.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingPage } from './BookingPage';
import * as sitesApi from '../../api/sites';
import * as appointmentsApi from '../../api/appointments';
import { AuthProvider } from '../../auth/AuthContext';
import * as authApi from '../../api/auth';

vi.mock('../../api/sites');
vi.mock('../../api/appointments');
vi.mock('../../api/auth');

const site = {
  id: 's1',
  name: 'Dayton DC-03',
  address: '1 Dock Way',
  timezone: 'America/New_York',
  operatorId: 'o1',
  status: 'live' as const,
  yardCapacity: null,
  minBookingNoticeMinutes: 120,
  maxDaysAhead: 21,
  doorBufferMinutes: 10,
  createdAt: '',
  updatedAt: '',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <BookingPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Simulate a signed-in tenant booker.
    localStorage.setItem('dockwise.accessToken', 'token');
    vi.mocked(authApi.fetchMe).mockResolvedValue({
      userId: 'u1',
      email: 'booker@frostline.example',
      fullName: 'Booker',
      memberships: [
        {
          organizationId: 'tenant-1',
          organizationName: 'Frostline',
          organizationType: 'tenant',
          role: 'tenant_booker',
        },
      ],
    });
    vi.mocked(sitesApi.listSites).mockResolvedValue([site]);
  });

  it('renders the site selector', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: /book an appointment/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/site/i)).toBeInTheDocument();
  });

  it('loads and renders available slots after picking a site', async () => {
    vi.mocked(appointmentsApi.queryAvailability).mockResolvedValue([
      {
        doorId: 'd1',
        doorNumber: 'L1',
        start: '2025-06-02T12:00:00Z',
        end: '2025-06-02T13:30:00Z',
      },
    ]);
    renderPage();
    await screen.findByLabelText(/site/i);
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    expect(await screen.findByText(/Door L1/)).toBeInTheDocument();
  });

  it('books an appointment and shows the confirmation code', async () => {
    vi.mocked(appointmentsApi.queryAvailability).mockResolvedValue([
      {
        doorId: 'd1',
        doorNumber: 'L1',
        start: '2025-06-02T12:00:00Z',
        end: '2025-06-02T13:30:00Z',
      },
    ]);
    const createMock = vi.mocked(appointmentsApi.createAppointment).mockResolvedValue({
      id: 'a1',
      confirmationCode: 'DW7K4Q2M',
      status: 'confirmed',
    } as never);
    renderPage();
    await screen.findByLabelText(/site/i);
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    await userEvent.click(await screen.findByText(/Door L1/));
    await userEvent.click(
      await screen.findByRole('button', { name: /book appointment/i }),
    );
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByText('DW7K4Q2M')).toBeInTheDocument();
  });
});
