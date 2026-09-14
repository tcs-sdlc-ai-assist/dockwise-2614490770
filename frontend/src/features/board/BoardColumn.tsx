/**
 * Board column: one swimlane of the live board.
 */
import type { BoardCard as BoardCardType } from '../../api/board';
import { BoardCard } from './BoardCard';

interface BoardColumnProps {
  /** The column title. */
  title: string;
  /** The cards in this column. */
  cards: BoardCardType[];
}

/**
 * Render a board column.
 *
 * Returns:
 *   The board column element.
 */
export function BoardColumn({ title, cards }: BoardColumnProps) {
  return (
    <section className="board-column" aria-label={title}>
      <h2 className="board-column-title">
        {title} <span className="muted">({cards.length})</span>
      </h2>
      <div className="board-column-cards">
        {cards.length === 0 && <p className="muted">None</p>}
        {cards.map((card) => (
          <BoardCard key={card.appointmentId} card={card} />
        ))}
      </div>
    </section>
  );
}
