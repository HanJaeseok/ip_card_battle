'use client';

import type { Animal, StackedCard } from 'shared';
import { ANIMALS } from 'shared';
import { StackCardView } from './StackCardView';
import type { ShakingPile } from '@/hooks/useAnimationQueue';

export function AnimalStackArea({
  stackCards,
  collectingIds,
  bombFallingIds,
  shakingPile,
  newCardId,
  isMyTurn,
}: {
  stackCards: Record<Animal, StackedCard[]>;
  collectingIds: ReadonlySet<number>;
  bombFallingIds: ReadonlySet<number>;
  shakingPile: ShakingPile | null;
  newCardId: number | null;
  isMyTurn: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 w-full h-full">
      {ANIMALS.map(animal => (
        <AnimalStackRow
          key={animal}
          animal={animal}
          cards={stackCards[animal]}
          collectingIds={collectingIds}
          bombFallingIds={bombFallingIds}
          isShaking={shakingPile?.animal === animal}
          newCardId={newCardId}
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
  bombFallingIds,
  isShaking,
  newCardId,
  isMyTurn,
}: {
  animal: Animal;
  cards: StackedCard[];
  collectingIds: ReadonlySet<number>;
  bombFallingIds: ReadonlySet<number>;
  isShaking: boolean;
  newCardId: number | null;
  isMyTurn: boolean;
}) {
  // cards는 이미 "지금 화면에 그려야 하는" 카드만 들어있다(useAnimationQueue의 stackCards).
  // 총합 배지는 실제로 아직 미획득이고 폭탄으로 떨어지는 중도 아닌 카드만 센다.
  const total = cards
    .filter(c => c.collectedBy === null && !bombFallingIds.has(c.id))
    .reduce((s, c) => s + c.num, 0);

  return (
    <div
      data-stack-area={animal}
      className="relative flex-1 min-h-0 bg-white/70 rounded-xl border border-jungle-200 flex items-center gap-3 px-4 overflow-visible"
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
      <div className="relative flex items-center flex-1 min-w-0 h-full overflow-visible">
        {cards.length === 0 ? (
          <span className="text-xs text-jungle-300">비어 있음</span>
        ) : (
          cards.map((c, i) => (
            <StackCardView
              key={c.id}
              card={c}
              index={i}
              isNew={c.id === newCardId}
              flingDirection={
                collectingIds.has(c.id) ? (c.collectedBy === 'A' ? 'left' : 'right') : null
              }
              isBombFalling={bombFallingIds.has(c.id)}
              shakeVariant={isShaking ? (i % 2 === 0 ? 'a' : 'b') : null}
            />
          ))
        )}
      </div>
    </div>
  );
}
