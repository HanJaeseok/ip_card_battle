import type { ClientBoardEntry } from 'shared';
import { BOARD_INITIAL, BOARD_EXPANDED } from 'shared';
import { CardCell } from './CardCell';

// 서버(board.ts)의 확장 링 좌표 계산과 반드시 동일해야 한다.
const EXPAND_OFFSET = Math.floor((BOARD_EXPANDED - BOARD_INITIAL) / 2);

export function CardGrid({
  board,
  expanded,
  isMyTurn,
  onCardClick,
  suppressedKeys,
  recentlyOpenedKeys,
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
  recentlyOpenedKeys: ReadonlySet<string>;
  reactionMap: ReadonlyMap<string, number>;
  joltAllFaceDown: boolean;
  breathe: boolean;
  collectGlowKeys: ReadonlyMap<string, string>;
}) {
  const minRC = expanded ? -EXPAND_OFFSET : 0;
  const maxRC = expanded ? BOARD_INITIAL + EXPAND_OFFSET - 1 : BOARD_INITIAL - 1;
  const size = maxRC - minRC + 1;

  const boardMap = new Map(board.map(e => [e.key, e]));

  return (
    <div
      className={`relative grid gap-1 ${breathe ? 'board-breathe' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 64px))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 80px))`,
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
          const isExpandedCell = r < 0 || r >= BOARD_INITIAL || c < 0 || c >= BOARD_INITIAL;
          return (
            <CardCell
              key={key}
              entry={entry}
              cardKey={key}
              isMyTurn={isMyTurn}
              isSuppressed={isSuppressed}
              isRecentlyOpened={recentlyOpenedKeys.has(key)}
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
