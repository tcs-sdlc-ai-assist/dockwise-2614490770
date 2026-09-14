/**
 * Coordinator queue page: the requested/countered queue with confirm, decline,
 * counter, and reassign actions, plus the exception list.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSites } from '../../api/sites';
import {
  getQueue,
  confirmAppointment,
  declineAppointment,
  reassignAppointment,
} from '../../api/queue';
import { ExceptionsPanel } from './ExceptionsPanel';
import { ReassignDialog } from './ReassignDialog';

/**
 * Render the coordinator queue page.
 *
 * Returns:
 *   The queue page element.
 */
export function QueuePage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });
  const queueQuery = useQuery({
    queryKey: ['queue', siteId],
    queryFn: () => getQueue(siteId),
    enabled: !!siteId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['queue', siteId] });

  const confirmMutation = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: invalidate,
    onError: () => setError('Could not confirm — the slot may conflict.'),
  });
  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      declineAppointment(id, reason),
    onSuccess: invalidate,
  });
  const reassignMutation = useMutation({
    mutationFn: ({
      id,
      toDoorId,
      reason,
    }: {
      id: string;
      toDoorId: string;
      reason: string;
    }) => reassignAppointment(id, toDoorId, reason),
    onSuccess: () => {
      invalidate();
      setReassigningId(null);
    },
    onError: () => setError('Could not reassign — the target door may conflict.'),
  });

  return (
    <main className="app-page">
      <h1>Confirmation queue</h1>

      <section className="card">
        <div className="field">
          <label htmlFor="queue-site">Site</label>
          <select
            id="queue-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">Select a site</option>
            {sitesQuery.data?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {siteId && (
        <>
          <section className="card">
            <h2>Requested &amp; countered</h2>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            {queueQuery.isLoading && <p className="muted">Loading…</p>}
            {queueQuery.data?.length === 0 && (
              <p className="muted">Queue is empty.</p>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Window</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueQuery.data?.map((appt) => (
                  <tr key={appt.id}>
                    <td className="confirmation-code">{appt.confirmationCode}</td>
                    <td>{new Date(appt.windowStart).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-warning">{appt.status}</span>
                    </td>
                    <td className="queue-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => confirmMutation.mutate(appt.id)}
                      >
                        Confirm
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          declineMutation.mutate({
                            id: appt.id,
                            reason: 'Declined by coordinator',
                          })
                        }
                      >
                        Decline
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setReassigningId(appt.id)}
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <ExceptionsPanel siteId={siteId} />
        </>
      )}

      {reassigningId && siteId && (
        <ReassignDialog
          siteId={siteId}
          appointmentId={reassigningId}
          onClose={() => setReassigningId(null)}
          onReassign={(toDoorId, reason) =>
            reassignMutation.mutate({ id: reassigningId, toDoorId, reason })
          }
          submitting={reassignMutation.isPending}
        />
      )}
    </main>
  );
}
