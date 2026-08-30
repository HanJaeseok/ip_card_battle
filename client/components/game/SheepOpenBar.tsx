'use client';

import { useEffect, useRef, useState } from 'react';
import { THRESHOLDS } from 'shared';
import { predictSheepRolls } from '@/lib/predict';

const MAX_ICONS = 10;

export function SheepOpenBar({
  sheepScore,
  boardTotal,
  reserveCount,
}: {
  sheepScore: number;
  boardTotal: number;
  reserveCount: number;
}) {
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

  // 실용신양 연쇄가 실제로 굴러가는 중(reserveCount > 0)에는 남은 뽑기 수를
  // 양 이모지로 보여주고, 평소에는 "지금 카드판의 양 카드를 획득하면" 몇 마리를
  // 추가로 뽑게 될지 예측해서 보여준다.
  const predictedRolls = predictSheepRolls(sheepScore, boardTotal);
  const isRolling = reserveCount > 0;
  const shown = Math.min(reserveCount, MAX_ICONS);
  const overflow = reserveCount - shown;

  return (
    <div className={`rounded-xl bg-lime-600 shadow-sm overflow-hidden relative ${isRolling ? 'sheep-bar-rolling' : ''}`}>
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative px-3 py-2">
        <p className="text-[0.65rem] text-white/80 leading-none mb-1 text-center">
          현재 카드 획득 +{boardTotal}
        </p>
        {isRolling ? (
          <div className="flex flex-wrap items-center justify-center gap-1 min-h-[2.4rem] relative">
            {Array.from({ length: shown }, (_, i) => (
              <span key={i} className="text-2xl leading-none">🐑</span>
            ))}
            {overflow > 0 && (
              <span className="text-base font-bold text-white ml-0.5">+{overflow}</span>
            )}
            {pops.map(id => (
              <span key={id} className="sheep-pop-burst">🐑</span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-white tracking-wide leading-tight text-center">
            🐑 {predictedRolls > 0 ? `점수 획득시 +${predictedRolls}마리 추가 뽑기` : '발동 없음'}
          </p>
        )}
      </div>
    </div>
  );
}
