'use client';

import { useLayoutEffect, useState } from 'react';
import type { RabbitFlight } from '@/hooks/useAnimationQueue';

interface Point {
  x: number;
  y: number;
  fx: number; // 목적지까지의 상대 이동량 (x)
  fy: number; // 목적지까지의 상대 이동량 (y)
}

export function RabbitFlightLayer({ flights }: { flights: RabbitFlight[] }) {
  return (
    <>
      {flights.map(f => (
        <FlightGroup key={f.id} flight={f} />
      ))}
    </>
  );
}

function FlightGroup({ flight }: { flight: RabbitFlight }) {
  const [points, setPoints] = useState<Point[] | null>(null);

  // 실제 DOM 위치를 측정해 카드 좌표 → 점수판 좌표로의 이동량을 계산한다.
  // (보드가 팬/줌 되어 있어도 getBoundingClientRect는 항상 실제 화면 좌표를 반환한다)
  useLayoutEffect(() => {
    const targetEl = document.querySelector(`[data-rabbit-target="${flight.team}"]`);
    if (!targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;

    const next: Point[] = [];
    for (const key of flight.sourceKeys) {
      const el = document.querySelector(`[data-card-key="${CSS.escape(key)}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      next.push({ x, y, fx: tx - x, fy: ty - y });
    }
    setPoints(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id]);

  if (!points) return null;

  return (
    <>
      {points.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'fixed',
            left: p.x,
            top: p.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          <span
            className="rabbit-flight-inner"
            style={{
              '--fx': `${p.fx}px`,
              '--fy': `${p.fy}px`,
              animationDelay: `${i * 60}ms`,
            } as React.CSSProperties}
          >
            🐰
          </span>
        </span>
      ))}
    </>
  );
}
