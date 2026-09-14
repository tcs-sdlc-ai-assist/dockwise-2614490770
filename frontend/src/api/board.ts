/**
 * Live board API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** A single board card. */
export interface BoardCard {
  appointmentId: string;
  confirmationCode: string;
  tenantId: string;
  carrierName: string | null;
  doorId: string | null;
  doorNumber: string | null;
  windowStart: string;
  windowEnd: string;
  status: string;
  minutesVsWindow: number | null;
  color: 'green' | 'amber' | 'red' | 'purple';
}

/** The board snapshot buckets. */
export interface BoardSnapshot {
  siteId: string;
  generatedAt: string;
  upcoming: BoardCard[];
  inYard: BoardCard[];
  atDoor: BoardCard[];
  exceptions: BoardCard[];
}

/** Fetch the live board snapshot for a site. */
export async function getBoardSnapshot(siteId: string): Promise<BoardSnapshot> {
  const res = await apiClient.get<BoardSnapshot>(`/api/v1/board/${siteId}`);
  return res.data;
}
