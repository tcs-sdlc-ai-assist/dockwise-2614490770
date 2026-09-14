/**
 * Live board page: the single-screen operational view for site and gate.
 *
 * Auto-refreshes every 10 seconds and shows Upcoming, In yard, At door, and
 * Exceptions columns.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSites } from '../../api/sites';
import { useBoardPolling } from './useBoardPolling';
import { BoardColumn } from './BoardColumn';

/**
 * Render the live board page.
 *
 * Returns:
 *   The live board element.
 */
export function LiveBoardPage() {
  const [siteId, setSiteId] = useState('');
  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });
  const boardQuery = useBoardPolling(siteId);

  return (
    <main className="app-page board-page">
      <div className="board-header">
        <h1>Live board</h1>
        <div className="field board-site-field">
          <label htmlFor="board-site">Site</label>
          <select
            id="board-site"
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
      </div>

      {siteId && boardQuery.isLoading && (
        <p className="muted" role="status">
          Loading board…
        </p>
      )}

      {siteId && boardQuery.data && (
        <div className="board-grid">
          <BoardColumn title="Upcoming (2h)" cards={boardQuery.data.upcoming} />
          <BoardColumn title="In yard" cards={boardQuery.data.inYard} />
          <BoardColumn title="At door" cards={boardQuery.data.atDoor} />
          <BoardColumn title="Exceptions" cards={boardQuery.data.exceptions} />
        </div>
      )}
    </main>
  );
}
