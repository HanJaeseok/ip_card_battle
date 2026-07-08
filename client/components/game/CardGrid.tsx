import type { ClientBoardEntry } from 'shared';
import { CardCell } from './CardCell';

export function CardGrid({
  board,
  expanded,
  isMyTurn,
  onCardClick,
  suppressedKeys,
  reactionMap,
  joltAllFaceDown,
  breathe,
  collectGlowKeys,
}: {
  board: ClientBoardEntry[];
  expanded: boolean;
  isMyTurn: boolean;
  onCardClick: (key: string) => void;
  suppressedKeys: ReadonlySet<string>;
  reactionMap: ReadonlyMap<string, number>;
  joltAllFaceDown: boolean;
  breathe: boolean;
  collectGlowKeys: ReadonlyMap<string, string>;
}) {
  const minRC = expanded ? -2 : 0;
  const maxRC = expanded ? 11 : 9;
  const size = maxRC - minRC + 1;

  const boardMap = new Map(board.map(e => [e.key, e]));

  return (
    <div
      className={`relative grid gap-1 ${breathe ? 'board-breathe' : ''}`}
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
          const entry = boardMap.get(key) ?? null;
          const isSuppressed = suppressedKeys.has(key);
          const reactionNum = reactionMap.get(key) ?? null;
          // jolt: only face-down (not suppressed == not yet flipped)
          const isJolting = joltAllFaceDown && entry?.card.open === false && !isSuppressed;
          const isExpandedCell = r < 0 || r > 9 || c < 0 || c > 9;
          return (
            <CardCell
              key={key}
              entry={entry}
              cardKey={key}
              isMyTurn={isMyTurn}
              isSuppressed={isSuppressed}
              reactionNum={reactionNum}
              isJolting={isJolting}
              glowColor={collectGlowKeys.get(key) ?? null}
              isExpandedCell={isExpandedCell}
              onClick={onCardClick}
            />
          );
        })
      )}
    </div>
  );
}
