/**
 * Admin sites page: list sites and create a new site.
 *
 * Site admins and platform admins manage sites here. The list is loaded via
 * React Query; creation invalidates the list.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listSites, createSite } from '../../api/sites';

/**
 * Render the admin sites page.
 *
 * Returns:
 *   The sites page element.
 */
export function SitesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [error, setError] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });

  const createMutation = useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setName('');
      setAddress('');
      setError(null);
    },
    onError: () => setError('Could not create the site.'),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name || !address || !timezone) {
      setError('Name, address, and timezone are required.');
      return;
    }
    createMutation.mutate({ name, address, timezone });
  }

  return (
    <main className="app-page">
      <h1>Sites</h1>
      <section className="card">
        <h2>Add a site</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="site-name">Name</label>
            <input
              id="site-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-required="true"
            />
          </div>
          <div className="field">
            <label htmlFor="site-address">Address</label>
            <input
              id="site-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-required="true"
            />
          </div>
          <div className="field">
            <label htmlFor="site-timezone">Timezone</label>
            <input
              id="site-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              aria-required="true"
            />
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Adding…' : 'Add site'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>All sites</h2>
        {sitesQuery.isLoading && <p className="muted">Loading…</p>}
        {sitesQuery.isError && (
          <p className="error-text">Could not load sites.</p>
        )}
        {sitesQuery.data && sitesQuery.data.length === 0 && (
          <p className="muted">No sites yet.</p>
        )}
        <ul className="site-list">
          {sitesQuery.data?.map((site) => (
            <li key={site.id}>
              <Link to={`/admin/sites/${site.id}`}>{site.name}</Link>{' '}
              <span className="badge badge-info">{site.status}</span>{' '}
              <span className="muted">{site.timezone}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
