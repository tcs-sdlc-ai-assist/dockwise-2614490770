/**
 * Unit tests for the coordinator QueuePage component.
 *
 * Covers queue rendering, the confirm action, and the empty state.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueuePage } from './QueuePage';
import * as sitesApi from '../../api/sites';
import * as queueApi from '../../api/queue';

vi.mock('../../api/sites');
vi.mock('../../api/queue');

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

const requestedAppt = {
  id: 'a1',
  confirmationCode: 'DW7K4Q2M',
  siteId: 's1',
  tenantId: 'tenant-1',
  carrierId: null,
  carrierName: null,
  doorId: 'd1',
  activity: 'live unload',
  windowStart: '2025-06-02T12:00:00Z',
  windowEnd: '2025-06-02T13:00:00Z',
  vehicleType: null,
  referenceText: null,
  hazmat: false,
  afterHours: false,
  dropTrailer: false,
  gateNote: null,
  internalNote: null,
  status: 'requested',
  statusReason: null,
  tractorPlate: null,
  trailerNumber: null,
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
        <QueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('QueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sitesApi.listSites).mockResolvedValue([site]);
    vi.mocked(queueApi.getExceptions).mockResolvedValue([]);
  });

  async function selectSite() {
    // Wait for the async sites query to populate the option before selecting.
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dayton DC-03' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
  }

  it('renders the queue after selecting a site', async () => {
    vi.mocked(queueApi.getQueue).mockResolvedValue([requestedAppt]);
    renderPage();
    await selectSite();
    expect(await screen.findByText('DW7K4Q2M')).toBeInTheDocument();
  });

  it('confirms a requested appointment', async () => {
    vi.mocked(queueApi.getQueue).mockResolvedValue([requestedAppt]);
    const confirmMock = vi
      .mocked(queueApi.confirmAppointment)
      .mockResolvedValue({ ...requestedAppt, status: 'confirmed' });
    renderPage();
    await selectSite();
    await screen.findByText('DW7K4Q2M');
    const confirmButtons = screen.getAllByRole('button', { name: /^confirm$/i });
    await userEvent.click(confirmButtons[0]);
    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith('a1', expect.anything()),
    );
  });

  it('shows the empty state when the queue is empty', async () => {
    vi.mocked(queueApi.getQueue).mockResolvedValue([]);
    renderPage();
    await selectSite();
    expect(await screen.findByText(/queue is empty/i)).toBeInTheDocument();
  });
});
