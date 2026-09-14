/**
 * Unit tests for the LiveBoardPage component.
 *
 * Covers the four columns rendering and card content after selecting a site.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiveBoardPage } from './LiveBoardPage';
import * as sitesApi from '../../api/sites';
import * as boardApi from '../../api/board';

vi.mock('../../api/sites');
vi.mock('../../api/board');

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

const snapshot: boardApi.BoardSnapshot = {
  siteId: 's1',
  generatedAt: new Date().toISOString(),
  upcoming: [
    {
      appointmentId: 'a1',
      confirmationCode: 'UP12345',
      tenantId: 't1',
      carrierName: 'Northstar',
      doorId: 'd1',
      doorNumber: '11',
      windowStart: new Date().toISOString(),
      windowEnd: new Date().toISOString(),
      status: 'confirmed',
      minutesVsWindow: null,
      color: 'green',
    },
  ],
  inYard: [],
  atDoor: [],
  exceptions: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LiveBoardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LiveBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sitesApi.listSites).mockResolvedValue([site]);
    vi.mocked(boardApi.getBoardSnapshot).mockResolvedValue(snapshot);
  });

  it('renders the four board columns after selecting a site', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dayton DC-03' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    expect(
      await screen.findByRole('heading', { name: /upcoming \(2h\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /in yard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /at door/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /exceptions/i }),
    ).toBeInTheDocument();
  });

  it('shows an empty board when there are no cards', async () => {
    vi.mocked(boardApi.getBoardSnapshot).mockResolvedValue({
      ...snapshot,
      upcoming: [],
      inYard: [],
      atDoor: [],
      exceptions: [],
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dayton DC-03' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    // Each column shows the "None" empty state.
    const noneCells = await screen.findAllByText('None');
    expect(noneCells.length).toBeGreaterThan(0);
  });

  it('renders a card with the confirmation code and door', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dayton DC-03' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/site/i), 's1');
    expect(await screen.findByText('UP12345')).toBeInTheDocument();
    expect(screen.getByText('Door 11')).toBeInTheDocument();
  });
});
