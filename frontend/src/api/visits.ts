/**
 * Visits/gate/dock API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** A visit. */
export interface Visit {
  id: string;
  siteId: string;
  appointmentId: string | null;
  tenantId: string | null;
  carrierName: string | null;
  driverName: string | null;
  tractorPlate: string;
  trailerNumber: string;
  doorId: string | null;
  status: string;
  arrivedAt: string;
  doorReadyAt: string | null;
  loadStartAt: string | null;
  loadCompleteAt: string | null;
  exitedAt: string | null;
  outboundSeal: string | null;
  outboundLoadState: string | null;
  gateClosedWithoutDock: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A search result pairing an appointment with any linked visit. */
export interface VisitSearchResult {
  appointmentId: string;
  confirmationCode: string;
  tenantId: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  doorId: string | null;
  visitId: string | null;
}

/** An unscheduled visit record. */
export interface UnscheduledVisit {
  id: string;
  siteId: string;
  tenantId: string | null;
  unknownTenant: boolean;
  carrierName: string | null;
  tractorPlate: string;
  trailerNumber: string | null;
  driverName: string | null;
  reason: string;
  status: string;
  visitId: string | null;
  arrivedAt: string;
  createdAt: string;
}

/** Search appointments/visits. */
export async function searchVisits(
  siteId: string,
  q: string,
): Promise<VisitSearchResult[]> {
  const res = await apiClient.get<VisitSearchResult[]>('/api/v1/visits/search', {
    params: { siteId, q },
  });
  return res.data;
}

/** Check a vehicle in for an appointment. */
export async function checkIn(
  appointmentId: string,
  input: { driverName: string; tractorPlate: string; trailerNumber: string },
): Promise<Visit> {
  const res = await apiClient.post<Visit>(
    `/api/v1/visits/appointments/${appointmentId}/check-in`,
    input,
  );
  return res.data;
}

/** Check a vehicle out. */
export async function checkOut(
  visitId: string,
  input: { outboundSeal?: string; outboundLoadState?: 'empty' | 'loaded' },
): Promise<Visit> {
  const res = await apiClient.post<Visit>(
    `/api/v1/visits/${visitId}/check-out`,
    input,
  );
  return res.data;
}

/** Record a dock status event. */
export async function recordDockEvent(
  visitId: string,
  type: 'door_ready' | 'load_start' | 'load_complete',
): Promise<Visit> {
  const res = await apiClient.post<Visit>('/api/v1/visits/dock-event', {
    visitId,
    type,
  });
  return res.data;
}

/** Log an unscheduled visit. */
export async function logUnscheduled(input: {
  siteId: string;
  tenantId?: string;
  unknownTenant?: boolean;
  carrierName?: string;
  tractorPlate: string;
  trailerNumber?: string;
  driverName?: string;
  reason: string;
}): Promise<UnscheduledVisit> {
  const res = await apiClient.post<UnscheduledVisit>(
    '/api/v1/visits/unscheduled',
    input,
  );
  return res.data;
}

/** Turn away an unscheduled visit. */
export async function turnAwayUnscheduled(id: string): Promise<UnscheduledVisit> {
  const res = await apiClient.post<UnscheduledVisit>(
    `/api/v1/visits/unscheduled/${id}/turn-away`,
  );
  return res.data;
}

/** List unscheduled visits for a site. */
export async function listUnscheduled(siteId: string): Promise<UnscheduledVisit[]> {
  const res = await apiClient.get<UnscheduledVisit[]>(
    '/api/v1/visits/unscheduled',
    { params: { siteId } },
  );
  return res.data;
}

/** Get a visit by id. */
export async function getVisit(id: string): Promise<Visit> {
  const res = await apiClient.get<Visit>(`/api/v1/visits/${id}`);
  return res.data;
}
