'use client';

import { useLayoutEffect, useState } from 'react';
import type { CardFocusItem } from '@/hooks/useAnimationQueue';

// 지금 막 뒤집히는 카드로 시선을 모으는 연출 — 사방에서 짧은 빔이 모여들었다가
// 카드 전체가 확대되며 페이드아웃된다.
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

  return (
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
      <span className="card-focus-beam-wrap n"><span className="card-focus-beam" /></span>
      <span className="card-focus-beam-wrap s"><span className="card-focus-beam" /></span>
      <span className="card-focus-beam-wrap e"><span className="card-focus-beam" /></span>
      <span className="card-focus-beam-wrap w"><span className="card-focus-beam" /></span>
    </span>
  );
}
