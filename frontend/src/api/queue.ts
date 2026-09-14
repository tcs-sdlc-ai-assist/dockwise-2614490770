/**
 * Coordinator queue API calls for the Dockwise frontend.
 */
import { apiClient } from './client';
import type { Appointment } from './appointments';

/** A reassignment history record. */
export interface Reassignment {
  id: string;
  appointmentId: string;
  fromDoorId: string | null;
  toDoorId: string;
  reason: string;
  actorUserId: string;
  createdAt: string;
}

/** List the requested/countered queue for a site. */
export async function getQueue(siteId: string): Promise<Appointment[]> {
  const res = await apiClient.get<Appointment[]>('/api/v1/queue', {
    params: { siteId },
  });
  return res.data;
}

/** List exceptions for a site. */
export async function getExceptions(siteId: string): Promise<Appointment[]> {
  const res = await apiClient.get<Appointment[]>('/api/v1/queue/exceptions', {
    params: { siteId },
  });
  return res.data;
}

/** Confirm a requested/countered appointment. */
export async function confirmAppointment(id: string): Promise<Appointment> {
  const res = await apiClient.post<Appointment>(`/api/v1/queue/${id}/confirm`);
  return res.data;
}

/** Decline an appointment with a reason. */
export async function declineAppointment(
  id: string,
  reason: string,
): Promise<Appointment> {
  const res = await apiClient.post<Appointment>(`/api/v1/queue/${id}/decline`, {
    reason,
  });
  return res.data;
}

/** Counter an appointment with a proposed window. */
export async function counterAppointment(
  id: string,
  windowStart: string,
  windowEnd: string,
): Promise<Appointment> {
  const res = await apiClient.post<Appointment>(`/api/v1/queue/${id}/counter`, {
    windowStart,
    windowEnd,
  });
  return res.data;
}

/** Reassign an appointment to a different door. */
export async function reassignAppointment(
  id: string,
  toDoorId: string,
  reason: string,
): Promise<Appointment> {
  const res = await apiClient.post<Appointment>(`/api/v1/queue/${id}/reassign`, {
    toDoorId,
    reason,
  });
  return res.data;
}

/** Get the reassignment history for an appointment. */
export async function getReassignments(id: string): Promise<Reassignment[]> {
  const res = await apiClient.get<Reassignment[]>(
    `/api/v1/queue/${id}/reassignments`,
  );
  return res.data;
}
