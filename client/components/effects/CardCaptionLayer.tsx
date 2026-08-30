'use client';

import { useLayoutEffect, useState } from 'react';
import type { Team } from 'shared';
import type { CaptionItem } from '@/hooks/useAnimationQueue';

// 카드판 위에 "페어 성사(카드 폭발 포함) / 효과 발동"을 큰 자막으로 강조한다.
// pair는 그 동물 스택 위에, effect는 보드 중앙에 고정 표시한다.
// effect 자막은 우리 팀이 발동시켰으면 초록, 상대 팀이면 빨강, 중립이면 금색으로 구분한다.
export function CardCaptionLayer({
  captions,
  myTeam,
}: {
  captions: CaptionItem[];
  myTeam: Team | null;
}) {
  const effectCaptions = captions.filter(c => c.tier === 'effect');
  const anchoredCaptions = captions.filter(c => c.tier !== 'effect');

  return (
    <>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none z-40">
        {effectCaptions.map(c => {
          const sideClass =
            c.team === undefined
              ? 'card-caption-effect-neutral'
              : myTeam !== null && c.team === myTeam
                ? 'card-caption-effect-ally'
                : 'card-caption-effect-enemy';
          return (
            <span key={c.id} className={`card-caption card-caption-effect ${sideClass}`}>
              {c.text}
            </span>
          );
        })}
      </div>
      {anchoredCaptions.map(c => (
        <AnchoredCaption key={c.id} caption={c} />
      ))}
    </>
  );
}

// tier별 오프셋(px)
const TIER_OFFSET: Record<string, number> = { pair: 62 };

function AnchoredCaption({ caption }: { caption: CaptionItem }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const selector = caption.placeKey
      ? `[data-place-key="${caption.placeKey}"]`
      : caption.stackAnimal
        ? `[data-stack-area="${caption.stackAnimal}"]`
        : null;
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption.id]);

  if (!pos) return null;

  return (
    <span
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y - TIER_OFFSET[caption.tier],
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 41,
      }}
    >
      <span className={`card-caption card-caption-${caption.tier}`}>{caption.text}</span>
    </span>
  );
}
