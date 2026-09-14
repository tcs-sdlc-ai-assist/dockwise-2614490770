/**
 * Unit tests for the DetentionCard component.
 *
 * Covers the estimate rendering, the mandatory disclaimer, and the
 * coordinator-only pause form visibility.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetentionCard } from './DetentionCard';
import * as detentionApi from '../../api/detention';
import * as authApi from '../../api/auth';
import { AuthProvider } from '../../auth/AuthContext';

vi.mock('../../api/detention');
vi.mock('../../api/auth');

const estimate: detentionApi.DetentionEstimate = {
  visitId: 'v1',
  arrival: '2025-06-02T12:00:00Z',
  clockStart: '2025-06-02T12:00:00Z',
  clockStop: '2025-06-02T16:00:00Z',
  freeTimeMinutes: 120,
  pausedMinutes: 0,
  billableMinutes: 120,
  disclaimer: 'Not an invoice. For discussion only.',
};

function renderCard(role: string) {
  localStorage.setItem('dockwise.accessToken', 'token');
  vi.mocked(authApi.fetchMe).mockResolvedValue({
    userId: 'u1',
    email: 'x@example.com',
    fullName: 'X',
    memberships: [
      {
        organizationId: 'o1',
        organizationName: 'Org',
        organizationType: role === 'tenant_admin' ? 'tenant' : 'property_operator',
        role: role as never,
      },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <DetentionCard visitId="v1" />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DetentionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(detentionApi.getDetention).mockResolvedValue(estimate);
    vi.mocked(detentionApi.listDetentionPauses).mockResolvedValue([]);
  });

  it('renders the estimate and the mandatory disclaimer', async () => {
    renderCard('site_coordinator');
    expect(
      await screen.findByText(/not an invoice\. for discussion only/i),
    ).toBeInTheDocument();
    // The billable figure is rendered in <strong>.
    const billable = await screen.findAllByText('120 min');
    expect(billable.length).toBeGreaterThan(0);
  });

  it('shows the pause form to a coordinator', async () => {
    renderCard('site_coordinator');
    expect(
      await screen.findByRole('heading', { name: /pause clock/i }),
    ).toBeInTheDocument();
  });

  it('hides the pause form from a tenant', async () => {
    renderCard('tenant_admin');
    await screen.findByText(/not an invoice/i);
    expect(
      screen.queryByRole('heading', { name: /pause clock/i }),
    ).not.toBeInTheDocument();
  });
});
