'use client';

import { useState, useEffect } from 'react';

export function TurnTimer({ deadline, paused }: { deadline: number; paused: boolean }) {
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    // 정산 애니메이션이 재생 중일 때는 실제 서버 타이머는 계속 흐르지만, 화면에는
    // 마지막으로 보여준 값 그대로 멈춰 있는 것처럼 표시해 다음 턴으로 성급히
    // 넘어간 듯한 느낌을 주지 않는다.
    if (paused) return;
    const tick = () => setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, paused]);

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
