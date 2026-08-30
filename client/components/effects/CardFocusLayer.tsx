'use client';

import { useLayoutEffect, useState } from 'react';
import type { CardFocusItem } from '@/hooks/useAnimationQueue';

// 지금 막 뒤집히는 카드로 시선을 모으는 연출 — 주변이 어두워지고 그 카드만
// 밝게 남으며, 테두리 링이 확대되며 페이드아웃된다.
export function CardFocusLayer({ items }: { items: CardFocusItem[] }) {
  return (
    <>
      {items.map(item => (
        <FocusBurst key={item.id} item={item} />
      ))}
    </>
  );
}

function FocusBurst({ item }: { item: CardFocusItem }) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = document.querySelector(`[data-card-key="${CSS.escape(item.cardKey)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  if (!rect) return null;

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  return (
    <>
      {/* 다른 곳은 어두워지고 지금 뒤집히는 카드만 밝게 남는 스포트라이트 */}
      <span
        className="card-spotlight-dim"
        style={{ '--spot-x': `${cx}px`, '--spot-y': `${cy}px` } as React.CSSProperties}
      />
      <span
        className="card-focus-burst"
        style={{
          position: 'fixed',
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
        }}
      >
        <span className="card-focus-ring" />
      </span>
    </>
  );
}
