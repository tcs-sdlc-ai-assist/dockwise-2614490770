/**
 * Board polling hook: refreshes the board snapshot on an interval.
 *
 * The board auto-refreshes at least every 10 seconds so perceived lag stays
 * under 2 seconds after another user changes status.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBoardSnapshot, type BoardSnapshot } from '../../api/board';

/** Polling interval in milliseconds (10 seconds). */
const POLL_INTERVAL_MS = 10_000;

/**
 * Poll the live board snapshot for a site.
 *
 * Args:
 *   siteId: The site id, or empty when no site is selected.
 *
 * Returns:
 *   The React Query result for the board snapshot.
 */
export function useBoardPolling(siteId: string) {
  const queryClient = useQueryClient();
  const query = useQuery<BoardSnapshot>({
    queryKey: ['board', siteId],
    queryFn: () => getBoardSnapshot(siteId),
    enabled: !!siteId,
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!siteId) {
      return;
    }
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['board', siteId] });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [siteId, queryClient]);

  return query;
}
