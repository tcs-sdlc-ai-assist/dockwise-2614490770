/**
 * Gate page: dominant search with large Check in / Check out actions and the
 * unscheduled-visit flow.
 *
 * Simplified, high-contrast view for shared gate devices. No hover-only
 * actions; tap targets are large.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSites } from '../../api/sites';
import {
  searchVisits,
  checkIn,
  checkOut,
  logUnscheduled,
  type VisitSearchResult,
} from '../../api/visits';
import { CheckInPanel } from './CheckInPanel';
import { UnscheduledPanel } from './UnscheduledPanel';

/**
 * Render the gate page.
 *
 * Returns:
 *   The gate page element.
 */
export function GatePage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<VisitSearchResult | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });

  const searchQuery = useQuery({
    queryKey: ['visit-search', siteId, query],
    queryFn: () => searchVisits(siteId, query),
    enabled: !!siteId && query.length >= 2,
  });

  const checkInMutation = useMutation({
    mutationFn: ({
      appointmentId,
      input,
    }: {
      appointmentId: string;
      input: { driverName: string; tractorPlate: string; trailerNumber: string };
    }) => checkIn(appointmentId, input),
    onSuccess: (visit) => {
      setMessage(`Checked in · ${visit.tractorPlate}`);
      setSelected(null);
      setQuery('');
      queryClient.invalidateQueries({ queryKey: ['visit-search'] });
    },
    onError: () => setMessage('Check-in failed.'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (visitId: string) => checkOut(visitId, {}),
    onSuccess: () => {
      setMessage('Checked out.');
      setSelected(null);
      setQuery('');
      queryClient.invalidateQueries({ queryKey: ['visit-search'] });
    },
    onError: () => setMessage('Check-out failed.'),
  });

  const unscheduledMutation = useMutation({
    mutationFn: logUnscheduled,
    onSuccess: () => {
      setMessage('Unscheduled visit logged. Coordinator notified.');
      setShowUnscheduled(false);
    },
    onError: () => setMessage('Could not log the unscheduled visit.'),
  });

  return (
    <main className="app-page gate-page">
      <h1>Gate</h1>

      <section className="card gate-panel">
        <div className="field">
          <label htmlFor="gate-site">Site</label>
          <select
            id="gate-site"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setSelected(null);
            }}
          >
            <option value="">Select a site</option>
            {sitesQuery.data?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {siteId && (
          <div className="field">
            <label htmlFor="gate-search">Search</label>
            <input
              id="gate-search"
              className="gate-search"
              placeholder="Confirmation, plate, trailer, or PO"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
            />
          </div>
        )}

        {message && (
          <p role="status" className="muted gate-message">
            {message}
          </p>
        )}
      </section>

      {siteId && query.length >= 2 && (
        <section className="card gate-panel">
          <h2>Results</h2>
          {searchQuery.isLoading && <p className="muted">Searching…</p>}
          {searchQuery.data?.length === 0 && (
            <div>
              <p className="muted">No appointment matches. Log unscheduled visit.</p>
              <button
                type="button"
                className="btn btn-secondary btn-large"
                onClick={() => setShowUnscheduled(true)}
              >
                Log unscheduled visit
              </button>
            </div>
          )}
          <ul className="gate-results">
            {searchQuery.data?.map((result) => (
              <li key={result.appointmentId}>
                <button
                  type="button"
                  className="gate-result"
                  onClick={() => setSelected(result)}
                >
                  <span className="confirmation-code">
                    {result.confirmationCode}
                  </span>{' '}
                  <span className="muted">
                    {new Date(result.windowStart).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {result.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && !selected.visitId && (
        <CheckInPanel
          result={selected}
          submitting={checkInMutation.isPending}
          onCheckIn={(input) =>
            checkInMutation.mutate({ appointmentId: selected.appointmentId, input })
          }
        />
      )}

      {selected && selected.visitId && (
        <section className="card gate-panel">
          <h2>Check out</h2>
          <p className="muted">{selected.confirmationCode}</p>
          <button
            type="button"
            className="btn btn-primary btn-large"
            disabled={checkOutMutation.isPending}
            onClick={() => checkOutMutation.mutate(selected.visitId!)}
          >
            {checkOutMutation.isPending ? 'Checking out…' : 'Check out'}
          </button>
        </section>
      )}

      {showUnscheduled && siteId && (
        <UnscheduledPanel
          siteId={siteId}
          submitting={unscheduledMutation.isPending}
          onSubmit={(input) => unscheduledMutation.mutate(input)}
        />
      )}
    </main>
  );
}
