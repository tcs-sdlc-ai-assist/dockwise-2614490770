/**
 * Site detail page: site summary plus door management and CSV import.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSite } from '../../api/sites';
import { DoorsPanel } from './DoorsPanel';
import { DoorImport } from './DoorImport';

/**
 * Render the site detail page.
 *
 * Returns:
 *   The site detail element.
 */
export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const siteQuery = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId!),
    enabled: !!siteId,
  });

  if (!siteId) {
    return <main className="app-page">Missing site id.</main>;
  }

  return (
    <main className="app-page">
      {siteQuery.isLoading && <p className="muted">Loading…</p>}
      {siteQuery.data && (
        <>
          <h1>{siteQuery.data.name}</h1>
          <p className="muted">
            {siteQuery.data.address} · {siteQuery.data.timezone} ·{' '}
            <span className="badge badge-info">{siteQuery.data.status}</span>
          </p>
          <DoorsPanel siteId={siteId} />
          <DoorImport siteId={siteId} />
        </>
      )}
    </main>
  );
}
