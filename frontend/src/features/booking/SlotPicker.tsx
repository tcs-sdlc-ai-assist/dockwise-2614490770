/**
 * Slot picker: available door/time slots for a site and day.
 *
 * Renders available slots in 30-minute increments and lets the booker select
 * one to drive the appointment form.
 */
import type { AvailabilitySlot } from '../../api/appointments';

interface SlotPickerProps {
  /** The available slots to render. */
  slots: AvailabilitySlot[];
  /** The currently selected slot, if any. */
  selected: AvailabilitySlot | null;
  /** Called when a slot is selected. */
  onSelect: (slot: AvailabilitySlot) => void;
  /** Whether slots are loading. */
  loading?: boolean;
}

/**
 * Format a UTC ISO time as a short HH:mm label.
 *
 * Args:
 *   iso: The ISO timestamp.
 *
 * Returns:
 *   A short time label.
 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render the slot picker.
 *
 * Returns:
 *   The slot picker element.
 */
export function SlotPicker({
  slots,
  selected,
  onSelect,
  loading,
}: SlotPickerProps) {
  if (loading) {
    return (
      <p className="muted" role="status">
        Loading available slots…
      </p>
    );
  }
  if (slots.length === 0) {
    return <p className="muted">No available slots for this day.</p>;
  }
  return (
    <div className="slot-grid" role="listbox" aria-label="Available slots">
      {slots.map((slot) => {
        const isSelected =
          selected?.doorId === slot.doorId && selected?.start === slot.start;
        return (
          <button
            key={`${slot.doorId}-${slot.start}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={`slot ${isSelected ? 'slot-selected' : ''}`}
            onClick={() => onSelect(slot)}
          >
            <span className="slot-door">Door {slot.doorNumber}</span>
            <span className="slot-time">
              {formatTime(slot.start)} – {formatTime(slot.end)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
