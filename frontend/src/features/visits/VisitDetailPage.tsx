/**
 * Visit detail page: the timestamped visit record plus the detention estimate.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVisit } from '../../api/visits';
import { DetentionCard } from './DetentionCard';

/**
 * Render the visit detail page.
 *
 * Returns:
 *   The visit detail element.
 */
export function VisitDetailPage() {
  const { visitId } = useParams<{ visitId: string }>();

  const visitQuery = useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => getVisit(visitId!),
    enabled: !!visitId,
  });

  if (!visitId) {
    return <main className="app-page">Missing visit id.</main>;
  }

  const visit = visitQuery.data;

  return (
    <main className="app-page">
      {visitQuery.isLoading && <p className="muted">Loading…</p>}
      {visit && (
        <>
          <h1>Visit {visit.tractorPlate}</h1>
          <section className="card">
            <h2>Timestamps</h2>
            <dl className="detention-facts">
              <div>
                <dt>Arrived</dt>
                <dd>{new Date(visit.arrivedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Door ready</dt>
                <dd>
                  {visit.doorReadyAt
                    ? new Date(visit.doorReadyAt).toLocaleString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Load start</dt>
                <dd>
                  {visit.loadStartAt
                    ? new Date(visit.loadStartAt).toLocaleString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Load complete</dt>
                <dd>
                  {visit.loadCompleteAt
                    ? new Date(visit.loadCompleteAt).toLocaleString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Exited</dt>
                <dd>
                  {visit.exitedAt
                    ? new Date(visit.exitedAt).toLocaleString()
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>
          <DetentionCard visitId={visit.id} />
        </>
      )}
    </main>
  );
}
