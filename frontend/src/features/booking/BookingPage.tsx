/**
 * Booking page: pick a site, day, and slot, then complete the appointment.
 *
 * Drives the availability query and the appointment creation. On success the
 * confirmation code is shown.
 */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { listSites } from '../../api/sites';
import {
  queryAvailability,
  createAppointment,
  type AvailabilitySlot,
  type Appointment,
} from '../../api/appointments';
import { SlotPicker } from './SlotPicker';
import { AppointmentForm } from './AppointmentForm';

/**
 * Render the booking page.
 *
 * Returns:
 *   The booking page element.
 */
export function BookingPage() {
  const { user } = useAuth();
  const tenantId =
    user?.memberships.find((m) => m.organizationType === 'tenant')
      ?.organizationId ?? '';

  const [siteId, setSiteId] = useState('');
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: listSites });

  const availabilityQuery = useQuery({
    queryKey: ['availability', siteId, day, durationMinutes],
    queryFn: () => queryAvailability(siteId, day, durationMinutes),
    enabled: !!siteId,
  });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: (appt) => {
      setBooked(appt);
      setSelected(null);
      setError(null);
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setError(
        status === 409
          ? 'That slot conflicts with a confirmed appointment. Pick another.'
          : 'Could not book the appointment.',
      );
    },
  });

  return (
    <main className="app-page">
      <h1>Book an appointment</h1>

      <section className="card">
        <div className="field">
          <label htmlFor="booking-site">Site</label>
          <select
            id="booking-site"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setSelected(null);
              setBooked(null);
            }}
          >
            <option value="">Select a site</option>
            {sitesQuery.data?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="booking-day">Day</label>
          <input
            id="booking-day"
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setSelected(null);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="booking-duration">Duration (minutes)</label>
          <select
            id="booking-duration"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
          >
            <option value={20}>20 (empty pickup)</option>
            <option value={30}>30 (drop)</option>
            <option value={90}>90 (live unload)</option>
            <option value={120}>120 (live load)</option>
          </select>
        </div>
      </section>

      {siteId && (
        <section className="card">
          <h2>Available slots</h2>
          <SlotPicker
            slots={availabilityQuery.data ?? []}
            selected={selected}
            onSelect={setSelected}
            loading={availabilityQuery.isLoading}
          />
        </section>
      )}

      {selected && (
        <section className="card">
          <h2>Appointment details</h2>
          <AppointmentForm
            slot={selected}
            siteId={siteId}
            tenantId={tenantId}
            onSubmit={(input) => createMutation.mutate(input)}
            submitting={createMutation.isPending}
            error={error}
          />
        </section>
      )}

      {booked && (
        <section className="card" role="status" aria-live="polite">
          <h2>Booked</h2>
          <p>
            Confirmation code:{' '}
            <strong className="confirmation-code">
              {booked.confirmationCode}
            </strong>
          </p>
          <p className="muted">
            Status: <span className="badge badge-info">{booked.status}</span>
          </p>
        </section>
      )}
    </main>
  );
}
