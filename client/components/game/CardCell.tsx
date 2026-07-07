import type { ClientBoardEntry } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

export function CardCell({
  entry,
  cardKey,
  isMyTurn,
  onClick,
}: {
  entry: ClientBoardEntry | null;
  cardKey: string;
  isMyTurn: boolean;
  onClick: (key: string) => void;
}) {
  if (!entry) {
    return <div className="w-11 h-14" />;
  }

  const { card } = entry;

  if (card.collectedBy !== null) {
    const teamColor = card.collectedBy === 'A' ? 'border-team-a/30' : 'border-team-b/30';
    return (
      <div
        className={`w-11 h-14 rounded-lg bg-gray-50 border ${teamColor} flex items-center justify-center opacity-35`}
      >
        <span className="text-gray-300 text-xs">✓</span>
      </div>
    );
  }

  if (card.open) {
    return (
      <div className="w-11 h-14 rounded-lg bg-white border-2 border-jungle-400 flex flex-col items-center justify-center shadow-sm gap-0.5">
        <span className="text-xl leading-none">{ANIMAL_INFO[card.animal].emoji}</span>
        <span className="text-sm font-bold text-jungle-800 tabular-nums">{card.num}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onClick(cardKey)}
      disabled={!isMyTurn}
      className={`w-11 h-14 rounded-lg border border-jungle-900 shadow-sm transition-all select-none ${
        isMyTurn
          ? 'bg-jungle-700 hover:bg-jungle-600 active:scale-95 cursor-pointer'
          : 'bg-jungle-800 cursor-not-allowed'
      }`}
    >
      <span className="text-jungle-400 text-xs font-bold">?</span>
    </button>
  );
}
