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

  // 상표토끼 스택 위치에서 점수판까지의 이동량을 계산한다 — 화면이 아무리
  // 리사이즈돼도 getBoundingClientRect는 항상 실제 화면 좌표를 반환한다.
  useLayoutEffect(() => {
    const targetEl = document.querySelector(`[data-rabbit-target="${flight.team}"]`);
    const sourceEl = document.querySelector('[data-stack-area="rabbit"]');
    if (!targetEl || !sourceEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;
    const x = sourceRect.left + sourceRect.width / 2;
    const y = sourceRect.top + sourceRect.height / 2;

    const next: Point[] = Array.from({ length: flight.count }, () => ({
      x, y, fx: tx - x, fy: ty - y,
    }));
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
