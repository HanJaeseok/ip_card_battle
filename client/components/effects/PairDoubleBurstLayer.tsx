'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DoubleBurstItem } from '@/hooks/useAnimationQueue';

const ACORN_COUNT = 8;

// 축제 중 페어가 정산될 때 경험치가 2배로 붙는 순간, 그 동물 스택 위에서 도토리가
// 작게 터지며 축하하는 연출. 카드 자체는 StackCardView가 이미 날아가는 연출을
// 재생하므로 여기서는 그 위에 겹쳐 보일 도토리 파편만 그린다.
export function PairDoubleBurstLayer({ items }: { items: DoubleBurstItem[] }) {
  return (
    <>
      {items.map(item => (
        <PairDoubleBurst key={item.id} item={item} />
      ))}
    </>
  );
}

function PairDoubleBurst({ item }: { item: DoubleBurstItem }) {
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
        const dist = 45 + (i % 3) * 18;
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
      <span className="pair-double-label">×2!</span>
    </div>
  );
}
