/**
 * Unit tests for the admin SitesPage component.
 *
 * Covers rendering the site list, the empty state, and the create-site
 * validation error.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SitesPage } from './SitesPage';
import * as sitesApi from '../../api/sites';

vi.mock('../../api/sites');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SitesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SitesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the list of sites', async () => {
    vi.mocked(sitesApi.listSites).mockResolvedValue([
      {
        id: 's1',
        name: 'Dayton DC-03',
        address: '1 Dock Way',
        timezone: 'America/New_York',
        operatorId: 'o1',
        status: 'shadow',
        yardCapacity: null,
        minBookingNoticeMinutes: 120,
        maxDaysAhead: 21,
        doorBufferMinutes: 10,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    renderPage();
    expect(await screen.findByText('Dayton DC-03')).toBeInTheDocument();
  });

  it('shows the empty state when there are no sites', async () => {
    vi.mocked(sitesApi.listSites).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/no sites yet/i)).toBeInTheDocument();
  });

  it('shows a validation error when required fields are empty', async () => {
    vi.mocked(sitesApi.listSites).mockResolvedValue([]);
    renderPage();
    await screen.findByText(/no sites yet/i);
    await userEvent.click(screen.getByRole('button', { name: /add site/i }));
    expect(
      await screen.findByText(/name, address, and timezone are required/i),
    ).toBeInTheDocument();
  });

  it('creates a site on valid submit', async () => {
    vi.mocked(sitesApi.listSites).mockResolvedValue([]);
    const createMock = vi.mocked(sitesApi.createSite).mockResolvedValue({} as never);
    renderPage();
    await screen.findByText(/no sites yet/i);
    await userEvent.type(screen.getByLabelText(/name/i), 'Dayton DC-03');
    await userEvent.type(screen.getByLabelText(/address/i), '1 Dock Way');
    await userEvent.click(screen.getByRole('button', { name: /add site/i }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
  });
});
