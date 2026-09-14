/**
 * Dashboard page: site-admin / tenant-admin operational metrics.
 *
 * Flat KPI cards with hairline borders and tabular figures per the minimalist
 * house style.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSites } from '../../api/sites';
import { getDashboard } from '../../api/reports';

/**
 * Render the dashboard page.
 *
 * Returns:
 *   The dashboard page element.
 */
export function DashboardPage() {
  const [siteId, setSiteId] = useState('');
  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', siteId],
    queryFn: () => getDashboard(siteId),
    enabled: !!siteId,
  });

  const metrics = dashboardQuery.data;

  return (
    <main className="app-page">
      <h1>Dashboard</h1>
      <section className="card">
        <div className="field">
          <label htmlFor="dashboard-site">Site</label>
          <select
            id="dashboard-site"
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

      {siteId && dashboardQuery.isLoading && (
        <p className="muted">Loading…</p>
      )}

      {metrics && (
        <>
          <div className="kpi-grid">
            <div className="card kpi">
              <p className="kpi-label">On-time arrival</p>
              <p className="kpi-value">
                {metrics.onTimePercent !== null
                  ? `${metrics.onTimePercent}%`
                  : '—'}
              </p>
            </div>
            <div className="card kpi">
              <p className="kpi-label">Avg dwell</p>
              <p className="kpi-value">
                {metrics.avgDwellMinutes !== null
                  ? `${metrics.avgDwellMinutes} min`
                  : '—'}
              </p>
            </div>
            <div className="card kpi">
              <p className="kpi-label">Unscheduled</p>
              <p className="kpi-value">{metrics.unscheduledCount}</p>
            </div>
            <div className="card kpi">
              <p className="kpi-label">Turn-aways</p>
              <p className="kpi-value">{metrics.turnAwayCount}</p>
            </div>
            <div className="card kpi">
              <p className="kpi-label">Late cancels</p>
              <p className="kpi-value">{metrics.lateCancelCount}</p>
            </div>
            <div className="card kpi">
              <p className="kpi-label">No-shows</p>
              <p className="kpi-value">{metrics.noShowCount}</p>
            </div>
          </div>

          <section className="card">
            <h2>Appointments by status (30 days)</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.byStatus30d).map(([status, count]) => (
                  <tr key={status}>
                    <td>{status}</td>
                    <td>{count}</td>
                  </tr>
                ))}
                {Object.keys(metrics.byStatus30d).length === 0 && (
                  <tr>
                    <td colSpan={2} className="muted">
                      No appointments in the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
