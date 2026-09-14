/**
 * Search page: 90-day operational search with filters and CSV export.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSites } from '../../api/sites';
import { searchReports, exportCsvUrl, type SearchFilters } from '../../api/reports';

/**
 * Render the search page.
 *
 * Returns:
 *   The search page element.
 */
export function SearchPage() {
  const [siteId, setSiteId] = useState('');
  const [plate, setPlate] = useState('');
  const [po, setPo] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [status, setStatus] = useState('');
  const [submitted, setSubmitted] = useState<SearchFilters | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });
  const searchQuery = useQuery({
    queryKey: ['reports-search', submitted],
    queryFn: () => searchReports(submitted!),
    enabled: !!submitted,
  });

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!siteId) {
      return;
    }
    setSubmitted({
      siteId,
      plate: plate || undefined,
      po: po || undefined,
      confirmationCode: confirmationCode || undefined,
      status: status || undefined,
    });
  }

  return (
    <main className="app-page">
      <h1>Search visits</h1>
      <section className="card">
        <form onSubmit={onSearch} className="search-form">
          <div className="field">
            <label htmlFor="search-site">Site</label>
            <select
              id="search-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              aria-required="true"
            >
              <option value="">Select a site</option>
              {sitesQuery.data?.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="search-plate">Plate</label>
            <input
              id="search-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="search-po">PO / BOL</label>
            <input
              id="search-po"
              value={po}
              onChange={(e) => setPo(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="search-code">Confirmation</label>
            <input
              id="search-code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="search-status">Status</label>
            <select
              id="search-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Any</option>
              <option value="confirmed">Confirmed</option>
              <option value="complete">Complete</option>
              <option value="exited">Exited</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </section>

      {submitted && (
        <section className="card">
          <div className="search-results-header">
            <h2>Results</h2>
            <a
              className="btn btn-secondary"
              href={exportCsvUrl(submitted)}
              download
            >
              Export CSV
            </a>
          </div>
          {searchQuery.isLoading && <p className="muted">Searching…</p>}
          {searchQuery.data?.length === 0 && (
            <p className="muted">No visits match the filter.</p>
          )}
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Carrier</th>
                <th scope="col">Status</th>
                <th scope="col">Driver</th>
                <th scope="col">Plate</th>
                <th scope="col">Window</th>
              </tr>
            </thead>
            <tbody>
              {searchQuery.data?.map((row) => (
                <tr key={row.appointmentId}>
                  <td className="confirmation-code">{row.confirmationCode}</td>
                  <td>{row.carrierName ?? '—'}</td>
                  <td>
                    <span className="badge badge-info">{row.status}</span>
                  </td>
                  <td>{row.driverName ?? '—'}</td>
                  <td>{row.tractorPlate ?? '—'}</td>
                  <td>{new Date(row.windowStart).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
