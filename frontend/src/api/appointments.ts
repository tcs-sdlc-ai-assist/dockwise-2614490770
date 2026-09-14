/**
 * Appointments API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** An appointment. */
export interface Appointment {
  id: string;
  confirmationCode: string;
  siteId: string;
  tenantId: string;
  carrierId: string | null;
  carrierName: string | null;
  doorId: string | null;
  activity: string;
  windowStart: string;
  windowEnd: string;
  vehicleType: string | null;
  referenceText: string | null;
  hazmat: boolean;
  afterHours: boolean;
  dropTrailer: boolean;
  gateNote: string | null;
  internalNote: string | null;
  status: string;
  statusReason: string | null;
  tractorPlate: string | null;
  trailerNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An available door/time slot. */
export interface AvailabilitySlot {
  doorId: string;
  doorNumber: string;
  start: string;
  end: string;
}

/** Attributes for creating an appointment. */
export interface CreateAppointmentInput {
  siteId: string;
  tenantId: string;
  doorId?: string;
  carrierId?: string;
  carrierName?: string;
  activity: string;
  windowStart: string;
  windowEnd: string;
  vehicleType?: string;
  referenceText?: string;
  hazmat?: boolean;
  afterHours?: boolean;
  dropTrailer?: boolean;
  gateNote?: string;
  internalNote?: string;
  saveAsDraft?: boolean;
}

/** Create an appointment. */
export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const res = await apiClient.post<Appointment>('/api/v1/appointments', input);
  return res.data;
}

/** Query available slots for a site and day. */
export async function queryAvailability(
  siteId: string,
  day: string,
  durationMinutes: number,
  vehicleType?: string,
): Promise<AvailabilitySlot[]> {
  const res = await apiClient.get<AvailabilitySlot[]>(
    '/api/v1/appointments/availability',
    { params: { siteId, day, durationMinutes, vehicleType } },
  );
  return res.data;
}

/** List appointments visible to the caller. */
export async function listAppointments(siteId?: string): Promise<Appointment[]> {
  const res = await apiClient.get<Appointment[]>('/api/v1/appointments', {
    params: siteId ? { siteId } : {},
  });
  return res.data;
}

/** Submit a draft appointment. */
export async function submitAppointment(id: string): Promise<Appointment> {
  const res = await apiClient.post<Appointment>(
    `/api/v1/appointments/${id}/submit`,
  );
  return res.data;
}

/** Cancel an appointment. */
export async function cancelAppointment(id: string): Promise<Appointment> {
  const res = await apiClient.post<Appointment>(
    `/api/v1/appointments/${id}/cancel`,
  );
  return res.data;
}
