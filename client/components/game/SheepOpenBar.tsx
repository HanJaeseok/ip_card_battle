'use client';

import { useEffect, useRef, useState } from 'react';
import { THRESHOLDS } from 'shared';

const MAX_ICONS = 10;

export function SheepOpenBar({
  sheepScore,
  reserveCount,
}: {
  sheepScore: number;
  reserveCount: number;
}) {
  // 현재 실용신양 점수(floor(score/10)) 기준 "이번 턴에 열 수 있는 추가 카드 수"를
  // 양 이모지로 시각화한다. 실제로 연쇄가 카드를 한 장 열 때마다 양이 한 마리씩
  // "뿅" 사라지고, 우리 팀 턴이 다시 시작되면 그 시점의 보유량으로 다시 가득 찬다.
  const threshold = THRESHOLDS.sheep;
  const scoreMod = sheepScore % threshold;
  const progress = (scoreMod / threshold) * 100;

  const prevRef = useRef(reserveCount);
  const [pops, setPops] = useState<number[]>([]);
  const popIdRef = useRef(0);

  useEffect(() => {
    if (reserveCount < prevRef.current) {
      const id = ++popIdRef.current;
      setPops(prev => [...prev, id]);
      const timer = setTimeout(() => {
        setPops(prev => prev.filter(p => p !== id));
      }, 500);
      prevRef.current = reserveCount;
      return () => clearTimeout(timer);
    }
    prevRef.current = reserveCount;
  }, [reserveCount]);

  const shown = Math.min(reserveCount, MAX_ICONS);
  const overflow = reserveCount - shown;

  return (
    <div className="rounded-xl bg-lime-600 shadow-sm overflow-hidden relative">
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative px-3 py-1.5">
        <p className="text-[0.65rem] text-white/80 leading-none mb-1 text-center">
          {threshold}점마다 · {scoreMod}/{threshold}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-0.5 min-h-[1.4rem] relative">
          {reserveCount === 0 ? (
            <span className="text-xs text-white/70">추가 오픈 없음</span>
          ) : (
            <>
              {Array.from({ length: shown }, (_, i) => (
                <span key={i} className="text-base leading-none">🐑</span>
              ))}
              {overflow > 0 && (
                <span className="text-xs font-bold text-white ml-0.5">+{overflow}</span>
              )}
            </>
          )}
          {pops.map(id => (
            <span key={id} className="sheep-pop-burst">🐑</span>
          ))}
        </div>
      </div>
    </div>
  );
}
