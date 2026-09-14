/**
 * Reassign dialog: choose a target door and a required reason.
 */
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listDoors } from '../../api/sites';

interface ReassignDialogProps {
  /** The site id (to list target doors). */
  siteId: string;
  /** The appointment id being reassigned. */
  appointmentId: string;
  /** Called with the target door and reason. */
  onReassign: (toDoorId: string, reason: string) => void;
  /** Called to close the dialog. */
  onClose: () => void;
  /** Whether the reassignment is in flight. */
  submitting?: boolean;
}

const REASONS = [
  { value: 'prior_overrun', label: 'Prior overrun' },
  { value: 'door_down', label: 'Door down' },
  { value: 'tenant_request', label: 'Tenant request' },
  { value: 'equipment_mismatch', label: 'Equipment mismatch' },
  { value: 'other', label: 'Other' },
];

/**
 * Render the reassign dialog.
 *
 * Returns:
 *   The reassign dialog element.
 */
export function ReassignDialog({
  siteId,
  appointmentId,
  onReassign,
  onClose,
  submitting,
}: ReassignDialogProps) {
  const [toDoorId, setToDoorId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const doorsQuery = useQuery({
    queryKey: ['doors', siteId],
    queryFn: () => listDoors(siteId),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!toDoorId || !reason) {
      setError('Choose a door and a reason.');
      return;
    }
    onReassign(toDoorId, reason);
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-title"
    >
      <div className="card modal">
        <h2 id="reassign-title">Reassign door</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reassign-door">New door</label>
            <select
              id="reassign-door"
              value={toDoorId}
              onChange={(e) => setToDoorId(e.target.value)}
            >
              <option value="">Select a door</option>
              {doorsQuery.data?.map((door) => (
                <option key={door.id} value={door.id}>
                  Door {door.number}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="reassign-reason">Reason</label>
            <select
              id="reassign-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-required="true"
            >
              <option value="">Select a reason</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Reassigning…' : 'Reassign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
