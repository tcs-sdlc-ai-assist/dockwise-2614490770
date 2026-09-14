/**
 * Board card: a single appointment on the live board.
 *
 * Shows tenant, carrier, door, window, status, and minutes-versus-window, with
 * a status color (green on-time, amber late, red exception, purple
 * unscheduled). Requested cards render dashed; confirmed render solid.
 */
import type { BoardCard as BoardCardType } from '../../api/board';

interface BoardCardProps {
  /** The card to render. */
  card: BoardCardType;
}

/**
 * Format minutes-versus-window as a human label.
 *
 * Args:
 *   minutes: Minutes versus window start (negative = early).
 *
 * Returns:
 *   A label such as "12m early", "On time", or "8m late".
 */
function timingLabel(minutes: number | null): string {
  if (minutes === null) {
    return '';
  }
  if (minutes < -1) {
    return `${Math.abs(minutes)}m early`;
  }
  if (minutes > 1) {
    return `${minutes}m late`;
  }
  return 'On time';
}

/**
 * Render a board card.
 *
 * Returns:
 *   The board card element.
 */
export function BoardCard({ card }: BoardCardProps) {
  const isRequested = card.status === 'requested';
  return (
    <div
      className={`board-card board-card-${card.color} ${
        isRequested ? 'board-card-requested' : ''
      }`}
      role="status"
    >
      <div className="board-card-top">
        <span className="confirmation-code">{card.confirmationCode}</span>
        {card.doorNumber && (
          <span className="board-card-door">Door {card.doorNumber}</span>
        )}
      </div>
      <div className="board-card-body">
        <span>{card.carrierName ?? 'Carrier TBD'}</span>
        <span className="muted">
          {new Date(card.windowStart).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="board-card-footer">
        <span className={`badge badge-${card.color === 'red' ? 'error' : card.color === 'amber' ? 'warning' : card.color === 'purple' ? 'info' : 'success'}`}>
          {card.status}
        </span>
        {card.minutesVsWindow !== null && (
          <span className="muted board-card-timing">
            {timingLabel(card.minutesVsWindow)}
          </span>
        )}
      </div>
    </div>
  );
}
