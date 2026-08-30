'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BombBurstItem } from '@/hooks/useAnimationQueue';

const ACORN_COUNT = 10;
const MAX_SHOWN_CARDS = 8;

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

  const shownCards = item.cardNums.slice(0, MAX_SHOWN_CARDS);

  return (
    <>
      {/* 미획득 카드들이 흔들리다 샤르륵 흘러내리며 사라진다 */}
      <div
        className="bomb-card-rack"
        style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 58 }}
      >
        {shownCards.map((num, i) => (
          <span
            key={i}
            className="bomb-card-ghost"
            style={{
              marginLeft: i === 0 ? 0 : -46,
              zIndex: shownCards.length - i,
              animationDelay: `${i * 45}ms`,
            }}
          >
            {num}
          </span>
        ))}
      </div>

      {/* 도토리 폭죽 — 여러 방향으로 튀어나갔다 사라진다 */}
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
    </>
  );
}
