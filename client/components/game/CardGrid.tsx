import type { ClientBoardEntry } from 'shared';
import { CardCell } from './CardCell';

export function CardGrid({
  board,
  expanded,
  isMyTurn,
  onCardClick,
}: {
  board: ClientBoardEntry[];
  expanded: boolean;
  isMyTurn: boolean;
  onCardClick: (key: string) => void;
}) {
  const minRC = expanded ? -2 : 0;
  const maxRC = expanded ? 11 : 9;
  const size = maxRC - minRC + 1;

  const boardMap = new Map(board.map(e => [e.key, e]));

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 44px))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 56px))`,
      }}
    >
      {Array.from({ length: size }, (_, ri) =>
        Array.from({ length: size }, (_, ci) => {
          const r = minRC + ri;
          const c = minRC + ci;
          const key = `${r},${c}`;
          return (
            <CardCell
              key={key}
              entry={boardMap.get(key) ?? null}
              cardKey={key}
              isMyTurn={isMyTurn}
              onClick={onCardClick}
            />
          );
        })
      )}
    </div>
  );
}
