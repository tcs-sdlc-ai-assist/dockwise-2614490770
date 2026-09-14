/**
 * Exceptions panel: appointments needing coordinator attention.
 *
 * Surfaces confirmed appointments on out-of-service doors and overdue
 * no-arrival appointments.
 */
import { useQuery } from '@tanstack/react-query';
import { getExceptions } from '../../api/queue';

/**
 * Render the exceptions panel for a site.
 *
 * Args:
 *   siteId: The site id.
 *
 * Returns:
 *   The exceptions panel element.
 */
export function ExceptionsPanel({ siteId }: { siteId: string }) {
  const exceptionsQuery = useQuery({
    queryKey: ['exceptions', siteId],
    queryFn: () => getExceptions(siteId),
  });

  return (
    <section className="card">
      <h2>Exceptions</h2>
      {exceptionsQuery.isLoading && <p className="muted">Loading…</p>}
      {exceptionsQuery.data?.length === 0 && (
        <p className="muted">No exceptions.</p>
      )}
      <ul className="exception-list">
        {exceptionsQuery.data?.map((appt) => (
          <li key={appt.id}>
            <span className="badge badge-error">exception</span>{' '}
            <span className="confirmation-code">{appt.confirmationCode}</span>{' '}
            <span className="muted">
              {new Date(appt.windowStart).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
