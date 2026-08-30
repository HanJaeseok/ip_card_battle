'use client';

import type { StackedCard } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

export function StackCardView({
  card,
  index,
  isNew,
}: {
  card: StackedCard;
  index: number;
  isNew: boolean;
}) {
  const flingClass =
    card.collectedBy === 'A' ? 'stack-card-fling-left' : card.collectedBy === 'B' ? 'stack-card-fling-right' : '';

  return (
    <div
      data-stack-card-id={card.id}
      className={`stack-card card-shadow ${flingClass} ${isNew ? 'stack-card-new' : ''}`}
      style={{ zIndex: index, marginLeft: index === 0 ? 0 : -46 }}
    >
      <span className="text-4xl leading-none">{ANIMAL_INFO[card.animal].emoji}</span>
      <span className="text-2xl font-black text-jungle-900 tabular-nums">{card.num}</span>
    </div>
  );
}
