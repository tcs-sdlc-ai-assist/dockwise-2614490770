/**
 * Sites and doors API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** A site. */
export interface Site {
  id: string;
  name: string;
  address: string;
  timezone: string;
  operatorId: string;
  status: 'shadow' | 'live';
  yardCapacity: number | null;
  minBookingNoticeMinutes: number;
  maxDaysAhead: number;
  doorBufferMinutes: number;
  createdAt: string;
  updatedAt: string;
}

/** A door. */
export interface Door {
  id: string;
  siteId: string;
  number: string;
  type: 'dock-high' | 'grade-level';
  group: string;
  reeferPower: boolean;
  containerSupport: boolean;
  maxTrailerLengthFt: number | null;
  status: 'in_service' | 'out_of_service';
  statusNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Attributes for creating a site. */
export interface CreateSiteInput {
  name: string;
  address: string;
  timezone: string;
  yardCapacity?: number;
}

/** Attributes for creating a door. */
export interface CreateDoorInput {
  number: string;
  type: 'dock-high' | 'grade-level';
  group?: string;
  reeferPower?: boolean;
  containerSupport?: boolean;
  maxTrailerLengthFt?: number;
}

/** Fetch sites visible to the caller. */
export async function listSites(): Promise<Site[]> {
  const res = await apiClient.get<Site[]>('/api/v1/sites');
  return res.data;
}

/** Create a site. */
export async function createSite(input: CreateSiteInput): Promise<Site> {
  const res = await apiClient.post<Site>('/api/v1/sites', input);
  return res.data;
}

/** Fetch a site by id. */
export async function getSite(id: string): Promise<Site> {
  const res = await apiClient.get<Site>(`/api/v1/sites/${id}`);
  return res.data;
}

/** List doors for a site. */
export async function listDoors(siteId: string): Promise<Door[]> {
  const res = await apiClient.get<Door[]>(`/api/v1/sites/${siteId}/doors`);
  return res.data;
}

/** Add a door to a site. */
export async function createDoor(
  siteId: string,
  input: CreateDoorInput,
): Promise<Door> {
  const res = await apiClient.post<Door>(`/api/v1/sites/${siteId}/doors`, input);
  return res.data;
}

/** Bulk-import doors into a site. */
export async function importDoors(
  siteId: string,
  doors: CreateDoorInput[],
): Promise<{ created: Door[]; skipped: number }> {
  const res = await apiClient.post<{ created: Door[]; skipped: number }>(
    `/api/v1/sites/${siteId}/doors/import`,
    { doors },
  );
  return res.data;
}

/** Mark a door out of service. */
export async function setDoorOutOfService(
  doorId: string,
  note: string,
): Promise<Door> {
  const res = await apiClient.patch<Door>(`/api/v1/doors/${doorId}/out-of-service`, {
    note,
  });
  return res.data;
}

/** Return a door to service. */
export async function setDoorInService(doorId: string): Promise<Door> {
  const res = await apiClient.patch<Door>(`/api/v1/doors/${doorId}/in-service`);
  return res.data;
}
