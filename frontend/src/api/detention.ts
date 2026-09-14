/**
 * Detention API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** The detention estimate for a visit. */
export interface DetentionEstimate {
  visitId: string;
  arrival: string;
  clockStart: string;
  clockStop: string | null;
  freeTimeMinutes: number;
  pausedMinutes: number;
  billableMinutes: number;
  disclaimer: string;
}

/** A detention pause record. */
export interface DetentionPause {
  id: string;
  visitId: string;
  reason: string;
  detail: string | null;
  startAt: string;
  endAt: string;
  actorUserId: string;
  createdAt: string;
}

/** Fetch the detention estimate for a visit. */
export async function getDetention(
  visitId: string,
  freeTimeMinutes?: number,
): Promise<DetentionEstimate> {
  const res = await apiClient.get<DetentionEstimate>(
    `/api/v1/visits/${visitId}/detention`,
    { params: freeTimeMinutes ? { freeTimeMinutes } : {} },
  );
  return res.data;
}

/** Pause the detention clock for a visit (coordinator only). */
export async function pauseDetention(
  visitId: string,
  input: { reason: string; detail?: string; startAt: string; endAt: string },
): Promise<DetentionPause> {
  const res = await apiClient.post<DetentionPause>(
    `/api/v1/visits/${visitId}/detention/pause`,
    input,
  );
  return res.data;
}

/** List detention pauses for a visit. */
export async function listDetentionPauses(
  visitId: string,
): Promise<DetentionPause[]> {
  const res = await apiClient.get<DetentionPause[]>(
    `/api/v1/visits/${visitId}/detention/pauses`,
  );
  return res.data;
}
