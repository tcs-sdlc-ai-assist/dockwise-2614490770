/**
 * Check-in panel: capture driver, plate, and trailer for a found appointment.
 *
 * Uses large tap targets and a high-contrast layout for shared gate devices.
 */
import { useState, type FormEvent } from 'react';
import type { VisitSearchResult } from '../../api/visits';

interface CheckInPanelProps {
  /** The found appointment to check in. */
  result: VisitSearchResult;
  /** Called with the check-in details. */
  onCheckIn: (input: {
    driverName: string;
    tractorPlate: string;
    trailerNumber: string;
  }) => void;
  /** Whether the check-in is in flight. */
  submitting?: boolean;
}

/**
 * Render the check-in panel.
 *
 * Returns:
 *   The check-in panel element.
 */
export function CheckInPanel({ result, onCheckIn, submitting }: CheckInPanelProps) {
  const [driverName, setDriverName] = useState('');
  const [tractorPlate, setTractorPlate] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!driverName || !tractorPlate || !trailerNumber) {
      setError('Driver name, plate, and trailer are required.');
      return;
    }
    onCheckIn({ driverName, tractorPlate, trailerNumber });
  }

  return (
    <section className="card gate-panel">
      <h2>Check in</h2>
      <p className="muted">
        {result.confirmationCode} ·{' '}
        {new Date(result.windowStart).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="driver-name">Driver name</label>
          <input
            id="driver-name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            aria-required="true"
          />
        </div>
        <div className="field">
          <label htmlFor="tractor-plate">Tractor plate</label>
          <input
            id="tractor-plate"
            value={tractorPlate}
            onChange={(e) => setTractorPlate(e.target.value)}
            aria-required="true"
          />
        </div>
        <div className="field">
          <label htmlFor="trailer-number">Trailer / container</label>
          <input
            id="trailer-number"
            value={trailerNumber}
            onChange={(e) => setTrailerNumber(e.target.value)}
            aria-required="true"
          />
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
          {submitting ? 'Checking in…' : 'Check in'}
        </button>
      </form>
    </section>
  );
}
