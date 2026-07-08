'use client';

import { useEffect, useRef, useState } from 'react';
import type { Animal, Team } from 'shared';
import { ANIMALS, THRESHOLDS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';
import { TigerAttackBar } from './TigerAttackBar';
import { MermaidExpectedBar } from './MermaidExpectedBar';
import { SheepOpenBar } from './SheepOpenBar';
import { RabbitBonusBar } from './RabbitBonusBar';

// ── 동물별 표 (아이콘 | 얇은 구분선 | 점수) — 가로로 넓게, 세로로 나열 ──────
function AnimalTable({
  animal,
  score,
  isFlashing,
  isPopping,
  hitDmg,
  targetAttr,
}: {
  animal: Animal;
  score: number;
  isFlashing: boolean;
  isPopping: boolean;
  hitDmg?: number;
  targetAttr?: string;
}) {
  return (
    <div
      data-rabbit-target={targetAttr}
      className={`relative border border-gray-200 rounded-lg overflow-hidden bg-white flex items-stretch ${hitDmg !== undefined ? 'table-hit' : ''}`}
    >
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

      {hitDmg !== undefined && (
        <span className="table-hit-float">-{hitDmg}</span>
      )}
    </div>
  );
}

export function ScorePanel({
  team,
  scores,
  lastLevel,
  opponentScores,
  turn,
  tigerSlashActive,
  tigerHitDmg,
  mermaidEffectType,
  scoreFlash,
}: {
  team: Team;
  scores: Record<Animal, number>;
  lastLevel: Record<Animal, number>;
  opponentScores: Record<Animal, number>;
  turn: number;
  tigerSlashActive: boolean;
  tigerHitDmg: number | null;
  mermaidEffectType: 'catchup' | 'bonus' | null;
  scoreFlash: ReadonlyMap<string, number>;
}) {
  const myTotal = ANIMALS.reduce((s, a) => s + scores[a], 0);
  const opTotal = ANIMALS.reduce((s, a) => s + opponentScores[a], 0);

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

  const showMermaid = mermaidEffectType !== null;

  const table = (a: Animal, opts?: { targetAttr?: string }) => {
    const flashKey = `${team}:${a}`;
    const hitDmg = tigerHitDmg !== null && (a === 'sheep' || a === 'rabbit') ? tigerHitDmg : undefined;
    return (
      <AnimalTable
        animal={a}
        score={scores[a]}
        isFlashing={scoreFlash.has(flashKey)}
        isPopping={popKeys.has(a)}
        hitDmg={hitDmg}
        targetAttr={opts?.targetAttr}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {table('sheep')}
        <SheepOpenBar count={Math.floor(scores.sheep / THRESHOLDS.sheep)} />
      </div>
      <div className="flex flex-col gap-1.5">
        {table('rabbit', { targetAttr: team })}
        <RabbitBonusBar turn={turn} />
      </div>
      <div className="flex flex-col gap-1.5">
        {table('mermaid')}
        <MermaidExpectedBar myTotal={myTotal} opTotal={opTotal} turn={turn} />
      </div>
      <div className="flex flex-col gap-1.5">
        {table('tiger')}
        <TigerAttackBar lastLevelTiger={lastLevel.tiger} turn={turn} />
      </div>

      <div className="bg-jungle-50 border border-jungle-200 rounded-lg px-3 py-2 text-center mt-1 relative overflow-hidden">
        {/* 특허랑이 공격 슬래시 오버레이 */}
        {tigerSlashActive && <div className="tiger-slash-overlay" />}

        {/* 디자인어 파동 오버레이 */}
        {showMermaid && <div className="mermaid-wave-overlay" />}

        <p className="text-xs text-jungle-500">합계</p>
        <p className="text-2xl font-bold text-jungle-800 tabular-nums">{myTotal}</p>
      </div>
    </div>
  );
}
