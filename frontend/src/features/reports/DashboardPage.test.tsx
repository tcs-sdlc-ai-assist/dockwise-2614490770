/**
 * Unit tests for the DashboardPage component.
 *
 * Covers the KPI cards and the by-status table after selecting a site.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardPage } from './DashboardPage';
import * as sitesApi from '../../api/sites';
import * as reportsApi from '../../api/reports';

vi.mock('../../api/sites');
vi.mock('../../api/reports');

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

const metrics: reportsApi.DashboardMetrics = {
  siteId: 's1',
  byStatus7d: { complete: 3 },
  byStatus30d: { complete: 8, confirmed: 2 },
  onTimePercent: 92,
  avgDwellMinutes: 78,
  unscheduledCount: 4,
  turnAwayCount: 1,
  lateCancelCount: 2,
  noShowCount: 1,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sitesApi.listSites).mockResolvedValue([site]);
    vi.mocked(reportsApi.getDashboard).mockResolvedValue(metrics);
  });

  it('renders the KPI cards after selecting a site', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dayton DC-03' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    expect(await screen.findByText('92%')).toBeInTheDocument();
    expect(screen.getByText('78 min')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // unscheduled
  });

  it('renders the by-status table', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dayton DC-03' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    expect(
      await screen.findByRole('heading', {
        name: /appointments by status \(30 days\)/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('complete')).toBeInTheDocument();
  });
});
