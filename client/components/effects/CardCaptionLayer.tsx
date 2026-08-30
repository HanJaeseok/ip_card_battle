'use client';

import { useLayoutEffect, useState } from 'react';
import type { CaptionItem } from '@/hooks/useAnimationQueue';

// 카드판 위에 "무엇을 뒤집었는지 / 페어 성사 / 효과 발동"을 큰 자막으로 강조한다.
// flip/pair는 실제로 뒤집힌 카드 바로 위에, effect는 보드 중앙에 고정 표시한다.
export function CardCaptionLayer({ captions }: { captions: CaptionItem[] }) {
  const effectCaptions = captions.filter(c => c.tier === 'effect');
  const anchoredCaptions = captions.filter(c => c.tier !== 'effect');

  return (
    <>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none z-40">
        {effectCaptions.map(c => (
          <span key={c.id} className="card-caption card-caption-effect">
            {c.text}
          </span>
        ))}
      </div>
      {anchoredCaptions.map(c => (
        <AnchoredCaption key={c.id} caption={c} />
      ))}
    </>
  );
}

// tier별 카드 위 오프셋(px) — pair가 flip보다 더 위에 뜨도록 해 같은 순간에 겹치지 않는다.
const TIER_OFFSET: Record<string, number> = { flip: 34, pair: 62 };

function AnchoredCaption({ caption }: { caption: CaptionItem }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!caption.cardKey) return;
    const el = document.querySelector(`[data-card-key="${CSS.escape(caption.cardKey)}"]`);
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
