'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { RabbitFlight } from '@/hooks/useAnimationQueue';

// 상표토끼 스킬 발동 — 중앙 토끼 스택에서 그 팀의 점수판(합계) 쪽으로 토끼가 날아간다.
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
  const [pos, setPos] = useState<{ x: number; y: number; fx: number; fy: number } | null>(null);

  useLayoutEffect(() => {
    const originEl = document.querySelector('[data-stack-area="rabbit"]');
    const targetEl = document.querySelector(`[data-rabbit-target="${flight.team}"]`);
    if (!originEl || !targetEl) return;
    const or = originEl.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();
    const x = or.left + or.width / 2;
    const y = or.top + or.height / 2;
    setPos({
      x,
      y,
      fx: tr.left + tr.width / 2 - x,
      fy: tr.top + tr.height / 2 - y,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.id]);

  if (!pos) return null;

  return (
    <>
      {Array.from({ length: flight.count }, (_, i) => (
        <span
          key={i}
          className="rabbit-flight-inner"
          style={
            {
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              '--fx': `${pos.fx}px`,
              '--fy': `${pos.fy}px`,
              animationDelay: `${i * 90}ms`,
              zIndex: 59,
              pointerEvents: 'none',
            } as CSSProperties
          }
        >
          🐰
        </span>
      ))}
    </>
  );
}
