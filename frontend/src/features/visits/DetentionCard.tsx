/**
 * Detention card: the display-only detention estimate for a visit.
 *
 * Always carries the mandatory "Not an invoice. For discussion only."
 * disclaimer. Coordinators can pause the clock for a site fault.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDetention,
  pauseDetention,
  listDetentionPauses,
} from '../../api/detention';
import { useAuth } from '../../auth/AuthContext';

interface DetentionCardProps {
  /** The visit id. */
  visitId: string;
}

/**
 * Render the detention estimate card.
 *
 * Returns:
 *   The detention card element.
 */
export function DetentionCard({ visitId }: DetentionCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isCoordinator = user?.memberships.some(
    (m) =>
      m.role === 'site_coordinator' ||
      m.role === 'site_admin' ||
      m.role === 'platform_admin',
  );

  const estimateQuery = useQuery({
    queryKey: ['detention', visitId],
    queryFn: () => getDetention(visitId),
  });
  const pausesQuery = useQuery({
    queryKey: ['detention-pauses', visitId],
    queryFn: () => listDetentionPauses(visitId),
  });

  const pauseMutation = useMutation({
    mutationFn: () =>
      pauseDetention(visitId, {
        reason: 'site_fault',
        detail: detail || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detention', visitId] });
      queryClient.invalidateQueries({ queryKey: ['detention-pauses', visitId] });
      setStartAt('');
      setEndAt('');
      setDetail('');
      setError(null);
    },
    onError: () => setError('Could not record the pause.'),
  });

  function onPause(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!startAt || !endAt) {
      setError('Start and end times are required.');
      return;
    }
    pauseMutation.mutate();
  }

  const est = estimateQuery.data;

  return (
    <section className="card detention-card">
      <h2>Detention estimate</h2>
      <p className="detention-disclaimer" role="note">
        {est?.disclaimer ?? 'Not an invoice. For discussion only.'}
      </p>

      {estimateQuery.isLoading && <p className="muted">Loading…</p>}
      {est && (
        <dl className="detention-facts">
          <div>
            <dt>Arrival</dt>
            <dd>{new Date(est.arrival).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Clock start</dt>
            <dd>{new Date(est.clockStart).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Clock stop</dt>
            <dd>
              {est.clockStop ? new Date(est.clockStop).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt>Free time</dt>
            <dd>{est.freeTimeMinutes} min</dd>
          </div>
          <div>
            <dt>Paused</dt>
            <dd>{est.pausedMinutes} min</dd>
          </div>
          <div>
            <dt>Billable</dt>
            <dd>
              <strong>{est.billableMinutes} min</strong>
            </dd>
          </div>
        </dl>
      )}

      {pausesQuery.data && pausesQuery.data.length > 0 && (
        <div>
          <h3>Pauses</h3>
          <ul className="pause-list">
            {pausesQuery.data.map((pause) => (
              <li key={pause.id}>
                {new Date(pause.startAt).toLocaleTimeString()} –{' '}
                {new Date(pause.endAt).toLocaleTimeString()} ·{' '}
                <span className="muted">{pause.detail ?? pause.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isCoordinator && (
        <form onSubmit={onPause} className="pause-form">
          <h3>Pause clock (site fault)</h3>
          <div className="field">
            <label htmlFor="pause-start">Pause start</label>
            <input
              id="pause-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              aria-required="true"
            />
          </div>
          <div className="field">
            <label htmlFor="pause-end">Pause end</label>
            <input
              id="pause-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              aria-required="true"
            />
          </div>
          <div className="field">
            <label htmlFor="pause-detail">Detail</label>
            <input
              id="pause-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={pauseMutation.isPending}
          >
            {pauseMutation.isPending ? 'Recording…' : 'Record pause'}
          </button>
        </form>
      )}
    </section>
  );
}
