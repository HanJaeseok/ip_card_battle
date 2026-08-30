'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BombBurstItem } from '@/hooks/useAnimationQueue';

const ACORN_COUNT = 10;

// 도토리 폭죽만 담당한다 — 실제로 터지는 카드는 StackCardView가 직접
// 흔들리며 떨어지는 연출(.stack-card-bomb-fall)을 재생하므로 여기서는
// 그 위에 겹쳐 보일 도토리 파편만 그린다.
export function BombBurstLayer({ items }: { items: BombBurstItem[] }) {
  return (
    <>
      {items.map(item => (
        <BombBurst key={item.id} item={item} />
      ))}
    </>
  );
}

function BombBurst({ item }: { item: BombBurstItem }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = document.querySelector(`[data-stack-area="${item.animal}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  if (!pos) return null;

  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, pointerEvents: 'none' }}>
      {Array.from({ length: ACORN_COUNT }, (_, i) => {
        const angle = (360 / ACORN_COUNT) * i;
        const dist = 55 + (i % 3) * 22;
        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad) * dist;
        const dy = Math.sin(rad) * dist;
        return (
          <span
            key={i}
            className="bomb-acorn"
            style={
              {
                '--acorn-dx': `${dx}px`,
                '--acorn-dy': `${dy}px`,
                animationDelay: `${(i % 4) * 30}ms`,
              } as CSSProperties
            }
          >
            🌰
          </span>
        );
      })}
    </div>
  );
}
