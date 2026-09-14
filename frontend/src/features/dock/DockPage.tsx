/**
 * Dock page: dock-lead status taps for door ready, load start, and load
 * complete.
 *
 * Large tap targets for tablet use; no cross-tenant internal notes are shown.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSites } from '../../api/sites';
import { searchVisits, recordDockEvent, getVisit } from '../../api/visits';

/**
 * Render the dock page.
 *
 * Returns:
 *   The dock page element.
 */
export function DockPage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [query, setQuery] = useState('');
  const [visitId, setVisitId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });
  const searchQuery = useQuery({
    queryKey: ['dock-search', siteId, query],
    queryFn: () => searchVisits(siteId, query),
    enabled: !!siteId && query.length >= 2,
  });
  const visitQuery = useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => getVisit(visitId!),
    enabled: !!visitId,
  });

  const dockMutation = useMutation({
    mutationFn: ({
      id,
      type,
    }: {
      id: string;
      type: 'door_ready' | 'load_start' | 'load_complete';
    }) => recordDockEvent(id, type),
    onSuccess: (visit) => {
      setMessage(`Recorded · status ${visit.status}`);
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
    },
    onError: () => setMessage('Could not record the event.'),
  });

  const visit = visitQuery.data;

  return (
    <main className="app-page gate-page">
      <h1>Dock</h1>

      <section className="card gate-panel">
        <div className="field">
          <label htmlFor="dock-site">Site</label>
          <select
            id="dock-site"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setVisitId(null);
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
            <label htmlFor="dock-search">Find visit</label>
            <input
              id="dock-search"
              className="gate-search"
              placeholder="Confirmation or plate"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
          <ul className="gate-results">
            {searchQuery.data?.map((result) => (
              <li key={result.appointmentId}>
                {result.visitId ? (
                  <button
                    type="button"
                    className="gate-result"
                    onClick={() => setVisitId(result.visitId)}
                  >
                    <span className="confirmation-code">
                      {result.confirmationCode}
                    </span>{' '}
                    <span className="muted">{result.status}</span>
                  </button>
                ) : (
                  <span className="muted">
                    {result.confirmationCode} · not yet arrived
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {visit && (
        <section className="card gate-panel">
          <h2>Visit {visit.tractorPlate}</h2>
          <p className="muted">
            Status: <span className="badge badge-info">{visit.status}</span>
          </p>
          <div className="dock-actions">
            <button
              type="button"
              className="btn btn-primary btn-large"
              disabled={visit.status !== 'arrived' || dockMutation.isPending}
              onClick={() => dockMutation.mutate({ id: visit.id, type: 'door_ready' })}
            >
              Door ready
            </button>
            <button
              type="button"
              className="btn btn-primary btn-large"
              disabled={visit.status !== 'at_door' || dockMutation.isPending}
              onClick={() => dockMutation.mutate({ id: visit.id, type: 'load_start' })}
            >
              Load start
            </button>
            <button
              type="button"
              className="btn btn-primary btn-large"
              disabled={visit.status !== 'in_progress' || dockMutation.isPending}
              onClick={() =>
                dockMutation.mutate({ id: visit.id, type: 'load_complete' })
              }
            >
              Load complete
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
