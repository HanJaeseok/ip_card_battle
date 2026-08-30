'use client';

import { useEffect, useRef, useState } from 'react';
import type { Animal, Team } from 'shared';
import { ANIMALS, THRESHOLDS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

// ── 동물별 표 — 아이콘 | 점수, 그 아래 경험치 바 + 레벨 ─────────────────────
function AnimalTable({
  animal,
  score,
  isFlashing,
  isPopping,
}: {
  animal: Animal;
  score: number;
  isFlashing: boolean;
  isPopping: boolean;
}) {
  const threshold = THRESHOLDS[animal];
  const level = Math.floor(score / threshold);
  const progressPct = ((score % threshold) / threshold) * 100;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-stretch">
        <div className="flex items-center justify-center px-3 py-2 flex-1 min-w-0">
          <span className="text-3xl leading-none">{ANIMAL_INFO[animal].emoji}</span>
        </div>
        <div className="border-l border-gray-200 px-3 py-2 flex items-center justify-center min-w-[4.5rem]">
          <p
            className={`text-2xl font-extrabold text-jungle-900 tabular-nums leading-tight ${isPopping ? 'score-pop' : ''}`}
            style={isFlashing ? { color: '#22c55e' } : undefined}
          >
            {score}
          </p>
        </div>
      </div>
      <div className="px-2 pb-1.5 pt-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-jungle-500 transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[0.65rem] text-jungle-500 text-right mt-0.5 font-bold">Lv. {level}</p>
      </div>
    </div>
  );
}

export function ScorePanel({
  team,
  scores,
  scoreFlash,
}: {
  team: Team;
  scores: Record<Animal, number>;
  scoreFlash: ReadonlyMap<string, number>;
}) {
  const myTotal = ANIMALS.reduce((s, a) => s + scores[a], 0);

  // 점수 팝 — flashKey 변경 시 re-trigger
  const [popKeys, setPopKeys] = useState<Set<Animal>>(new Set());
  const prevFlashRef = useRef<ReadonlyMap<string, number>>(new Map());

  useEffect(() => {
    const newPops = new Set<Animal>();
    scoreFlash.forEach((id, key) => {
      const [t, animal] = key.split(':') as [Team, Animal];
      if (t === team && id !== (prevFlashRef.current.get(key) ?? -1)) {
        newPops.add(animal);
      }
    });
    prevFlashRef.current = scoreFlash;
    if (newPops.size === 0) return;
    setPopKeys(prev => new Set([...prev, ...newPops]));
    const timer = setTimeout(() => {
      setPopKeys(prev => {
        const next = new Set(prev);
        newPops.forEach(a => next.delete(a));
        return next;
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [scoreFlash, team]);

  return (
    <div className="flex flex-col gap-2.5">
      {ANIMALS.map(a => (
        <AnimalTable
          key={a}
          animal={a}
          score={scores[a]}
          isFlashing={scoreFlash.has(`${team}:${a}`)}
          isPopping={popKeys.has(a)}
        />
      ))}

      <div className="bg-jungle-50 border border-jungle-200 rounded-lg px-3 py-2 text-center mt-1">
        <p className="text-xs text-jungle-500">합계</p>
        <p className="text-2xl font-bold text-jungle-800 tabular-nums">{myTotal}</p>
      </div>
    </div>
  );
}
