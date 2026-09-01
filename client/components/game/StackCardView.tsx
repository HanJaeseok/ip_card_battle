'use client';

import type { StackedCard } from 'shared';

export function StackCardView({
  card,
  index,
  isNew,
  flingDirection,
  isBombFalling,
  shakeVariant,
}: {
  card: StackedCard;
  index: number;
  isNew: boolean;
  flingDirection: 'left' | 'right' | null; // 짝이 맞아 팀 쪽으로 날아가는 중 (셔플/흔들기가 끝난 뒤에만 활성화)
  isBombFalling: boolean; // 도토리 폭탄으로 흔들리며 떨어지는 중
  shakeVariant: 'a' | 'b' | null; // 정산 직전 "짝 확인" 흔들림 — 홀수/짝수 번째가 반대 방향으로 흔들린다
}) {
  const flingClass =
    flingDirection === 'left' ? 'stack-card-fling-left' : flingDirection === 'right' ? 'stack-card-fling-right' : '';
  const bombClass = isBombFalling ? 'stack-card-bomb-fall' : '';
  const shakeClass = !flingDirection && !isBombFalling && shakeVariant ? `stack-card-shake-${shakeVariant}` : '';

  return (
    <div
      data-stack-card-id={card.id}
      className={`stack-card card-shadow ${flingClass} ${bombClass} ${shakeClass} ${isNew ? 'stack-card-new' : ''}`}
      style={{ zIndex: index, marginLeft: index === 0 ? 0 : -46 }}
    >
      <img src={`/emoticon/${card.animal}_focus.png`} alt={card.animal} className="w-12 h-12 object-contain" />
      <span className="text-2xl font-black text-jungle-900 tabular-nums">{card.num}</span>
    </div>
  );
}
