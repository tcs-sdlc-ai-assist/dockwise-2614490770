/**
 * Unscheduled visit panel: log a gate arrival with no matching appointment.
 */
import { useState, type FormEvent } from 'react';

interface UnscheduledPanelProps {
  /** The site id. */
  siteId: string;
  /** Called with the unscheduled visit details. */
  onSubmit: (input: {
    siteId: string;
    carrierName?: string;
    tractorPlate: string;
    trailerNumber?: string;
    driverName?: string;
    reason: string;
    unknownTenant?: boolean;
  }) => void;
  /** Whether the submission is in flight. */
  submitting?: boolean;
}

/**
 * Render the unscheduled visit panel.
 *
 * Returns:
 *   The unscheduled visit panel element.
 */
export function UnscheduledPanel({ siteId, onSubmit, submitting }: UnscheduledPanelProps) {
  const [tractorPlate, setTractorPlate] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tractorPlate || !reason) {
      setError('Plate and reason are required.');
      return;
    }
    onSubmit({
      siteId,
      tractorPlate,
      trailerNumber: trailerNumber || undefined,
      driverName: driverName || undefined,
      carrierName: carrierName || undefined,
      reason,
    });
  }

  return (
    <section className="card gate-panel">
      <h2>Log unscheduled visit</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="unscheduled-plate">Tractor plate</label>
          <input
            id="unscheduled-plate"
            value={tractorPlate}
            onChange={(e) => setTractorPlate(e.target.value)}
            aria-required="true"
          />
        </div>
        <div className="field">
          <label htmlFor="unscheduled-trailer">Trailer / container</label>
          <input
            id="unscheduled-trailer"
            value={trailerNumber}
            onChange={(e) => setTrailerNumber(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="unscheduled-driver">Driver name</label>
          <input
            id="unscheduled-driver"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="unscheduled-carrier">Carrier</label>
          <input
            id="unscheduled-carrier"
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="unscheduled-reason">Reason</label>
          <select
            id="unscheduled-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-required="true"
          >
            <option value="">Select a reason</option>
            <option value="early_without_appt">Early without appointment</option>
            <option value="wrong_day">Wrong day</option>
            <option value="hot_load">Hot load</option>
            <option value="other">Other</option>
          </select>
        </div>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-large"
          disabled={submitting}
        >
          {submitting ? 'Logging…' : 'Log unscheduled visit'}
        </button>
      </form>
    </section>
  );
}
