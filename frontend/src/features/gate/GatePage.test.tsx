/**
 * Unit tests for the GatePage component.
 *
 * Covers search, the empty-search unscheduled prompt, and the check-in flow.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatePage } from './GatePage';
import * as sitesApi from '../../api/sites';
import * as visitsApi from '../../api/visits';

vi.mock('../../api/sites');
vi.mock('../../api/visits');

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

const searchResult: visitsApi.VisitSearchResult = {
  appointmentId: 'a1',
  confirmationCode: 'GATE1234',
  tenantId: 't1',
  status: 'confirmed',
  windowStart: '2025-06-02T12:00:00Z',
  windowEnd: '2025-06-02T13:00:00Z',
  doorId: 'd1',
  visitId: null,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectSiteAndSearch(term: string) {
  await waitFor(() =>
    expect(
      screen.getByRole('option', { name: 'Dayton DC-03' }),
    ).toBeInTheDocument(),
  );
  await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
  await userEvent.type(screen.getByLabelText(/search/i), term);
}

describe('GatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sitesApi.listSites).mockResolvedValue([site]);
  });

  it('finds an appointment by confirmation and shows the check-in panel', async () => {
    vi.mocked(visitsApi.searchVisits).mockResolvedValue([searchResult]);
    renderPage();
    await selectSiteAndSearch('GATE1234');
    expect(await screen.findByText('GATE1234')).toBeInTheDocument();
    await userEvent.click(screen.getByText('GATE1234'));
    expect(
      await screen.findByRole('heading', { name: /check in/i }),
    ).toBeInTheDocument();
  });

  it('shows the unscheduled prompt when no appointment matches', async () => {
    vi.mocked(visitsApi.searchVisits).mockResolvedValue([]);
    renderPage();
    await selectSiteAndSearch('NOMATCH');
    expect(
      await screen.findByText(/no appointment matches\. log unscheduled visit/i),
    ).toBeInTheDocument();
  });

  it('checks in a vehicle with plate and trailer', async () => {
    vi.mocked(visitsApi.searchVisits).mockResolvedValue([searchResult]);
    const checkInMock = vi.mocked(visitsApi.checkIn).mockResolvedValue({
      id: 'v1',
      tractorPlate: 'ABC123',
      status: 'arrived',
    } as never);
    renderPage();
    await selectSiteAndSearch('GATE1234');
    await userEvent.click(await screen.findByText('GATE1234'));
    await userEvent.type(screen.getByLabelText(/driver name/i), 'Sam');
    await userEvent.type(screen.getByLabelText(/tractor plate/i), 'ABC123');
    await userEvent.type(screen.getByLabelText(/trailer \/ container/i), 'TRL1');
    await userEvent.click(screen.getByRole('button', { name: /^check in$/i }));
    await waitFor(() =>
      expect(checkInMock).toHaveBeenCalledWith('a1', {
        driverName: 'Sam',
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL1',
      }),
    );
  });
});
