'use client';

import type { Animal, StackedCard } from 'shared';
import { ANIMALS } from 'shared';
import { StackCardView } from './StackCardView';

export function AnimalStackArea({
  stacks,
  collectingIds,
  newCardId,
  revealedCardIds,
  isMyTurn,
}: {
  stacks: Record<Animal, StackedCard[]>;
  collectingIds: ReadonlySet<number>;
  newCardId: number | null;
  revealedCardIds: ReadonlySet<number>;
  isMyTurn: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 w-full h-full">
      {ANIMALS.map(animal => (
        <AnimalStackRow
          key={animal}
          animal={animal}
          cards={stacks[animal]}
          collectingIds={collectingIds}
          newCardId={newCardId}
          revealedCardIds={revealedCardIds}
          isMyTurn={isMyTurn}
        />
      ))}
    </div>
  );
}

function AnimalStackRow({
  animal,
  cards,
  collectingIds,
  newCardId,
  revealedCardIds,
  isMyTurn,
}: {
  animal: Animal;
  cards: StackedCard[];
  collectingIds: ReadonlySet<number>;
  newCardId: number | null;
  revealedCardIds: ReadonlySet<number>;
  isMyTurn: boolean;
}) {
  // 슬롯머신 연출이 아직 끝나지 않은 카드는 실제로 스택에 도착하기 전이므로 숨긴다.
  // (서버 상태는 액션이 끝나는 즉시 전부 반영되지만, 화면에는 연출이 끝난 카드만 순서대로 노출한다.)
  const visible = cards.filter(
    c => (c.collectedBy === null && revealedCardIds.has(c.id)) || (c.collectedBy !== null && collectingIds.has(c.id)),
  );
  const total = cards
    .filter(c => c.collectedBy === null && revealedCardIds.has(c.id))
    .reduce((s, c) => s + c.num, 0);

  return (
    <div
      data-stack-area={animal}
      className="relative flex-1 min-h-0 bg-white/70 rounded-xl border border-jungle-200 flex items-center gap-3 px-4 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-no-repeat bg-center opacity-15 pointer-events-none"
        style={{
          backgroundImage: `url(/emoticon/${animal}_${isMyTurn ? 'happy' : 'focus'}.png)`,
          backgroundSize: '33%',
        }}
      />
      <div className="relative flex items-center justify-center shrink-0 w-16">
        {total > 0 && (
          <span className="stack-total-badge text-4xl font-black text-jungle-900 tabular-nums">{total}</span>
        )}
      </div>
      <div className="relative flex items-center flex-1 min-w-0 h-full overflow-hidden">
        {visible.length === 0 ? (
          <span className="text-xs text-jungle-300">비어 있음</span>
        ) : (
          visible.map((c, i) => (
            <StackCardView key={c.id} card={c} index={i} isNew={c.id === newCardId} />
          ))
        )}
      </div>
    </div>
  );
}
