/**
 * Appointment form: capture activity, references, flags, and notes for a
 * selected slot.
 */
import { useState, type FormEvent } from 'react';
import type { AvailabilitySlot, CreateAppointmentInput } from '../../api/appointments';

interface AppointmentFormProps {
  /** The selected slot driving the window. */
  slot: AvailabilitySlot;
  /** The site id. */
  siteId: string;
  /** The tenant id. */
  tenantId: string;
  /** Called to submit the form. */
  onSubmit: (input: CreateAppointmentInput) => void;
  /** Whether the submission is in flight. */
  submitting?: boolean;
  /** Error message to display, if any. */
  error?: string | null;
}

/**
 * Render the appointment form.
 *
 * Returns:
 *   The appointment form element.
 */
export function AppointmentForm({
  slot,
  siteId,
  tenantId,
  onSubmit,
  submitting,
  error,
}: AppointmentFormProps) {
  const [activity, setActivity] = useState('live unload');
  const [referenceText, setReferenceText] = useState('');
  const [gateNote, setGateNote] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [afterHours, setAfterHours] = useState(false);
  const [hazmat, setHazmat] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      siteId,
      tenantId,
      doorId: slot.doorId,
      activity,
      windowStart: slot.start,
      windowEnd: slot.end,
      referenceText: referenceText || undefined,
      gateNote: gateNote || undefined,
      carrierName: carrierName || undefined,
      afterHours,
      hazmat,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="appointment-form">
      <div className="field">
        <label htmlFor="activity">Activity</label>
        <select
          id="activity"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        >
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
          <option value="empty">Empty</option>
          <option value="live unload">Live unload</option>
          <option value="live load">Live load</option>
          <option value="drop">Drop</option>
          <option value="hook">Hook</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="reference">PO / BOL / container</label>
        <input
          id="reference"
          value={referenceText}
          onChange={(e) => setReferenceText(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="carrier-name">Carrier name</label>
        <input
          id="carrier-name"
          value={carrierName}
          onChange={(e) => setCarrierName(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="gate-note">Gate note</label>
        <input
          id="gate-note"
          value={gateNote}
          onChange={(e) => setGateNote(e.target.value)}
        />
      </div>
      <div className="field checkbox-field">
        <label htmlFor="after-hours">
          <input
            id="after-hours"
            type="checkbox"
            checked={afterHours}
            onChange={(e) => setAfterHours(e.target.checked)}
          />{' '}
          After-hours
        </label>
      </div>
      <div className="field checkbox-field">
        <label htmlFor="hazmat">
          <input
            id="hazmat"
            type="checkbox"
            checked={hazmat}
            onChange={(e) => setHazmat(e.target.checked)}
          />{' '}
          Hazmat
        </label>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Booking…' : 'Book appointment'}
      </button>
    </form>
  );
}
