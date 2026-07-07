'use client';

import { useState, useEffect } from 'react';

export function TurnTimer({ deadline }: { deadline: number }) {
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline]);

  const pct = (remaining / 30) * 100;
  const isUrgent = remaining <= 5;
  const isWarn = remaining <= 10;

  const barColor = isUrgent
    ? 'bg-red-500'
    : isWarn
    ? 'bg-orange-400'
    : 'bg-yellow-300';

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <span className={isUrgent ? 'hourglass-shake' : ''} style={{ fontSize: '1rem' }}>
        ⏳
      </span>
      <div className="flex-1 bg-jungle-950 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-sm font-mono w-7 text-right tabular-nums ${
          isUrgent ? 'text-red-300 font-bold' : isWarn ? 'text-orange-200' : 'text-jungle-200'
        }`}
      >
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}
