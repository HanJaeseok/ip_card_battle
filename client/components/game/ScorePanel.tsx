'use client';

import { useEffect, useRef, useState } from 'react';
import type { Animal, ClientGameState, Team } from 'shared';
import { ANIMALS, THRESHOLDS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';
import { previewSkill } from '@/lib/skills';
import { SKILL_TITLE, describeSkill } from '@/lib/skillInfo';

// ── 동물별 표 — 아이콘 | 점수, 그 아래 경험치 바 + 레벨 ─────────────────────
// 마우스를 올리면 해당 동물 스킬의 설명과, 지금 고른다면 얻을 기댓값을 미리 보여준다.
function AnimalTable({
  animal,
  score,
  isFlashing,
  isPopping,
  gameState,
  team,
}: {
  animal: Animal;
  score: number;
  isFlashing: boolean;
  isPopping: boolean;
  gameState: ClientGameState;
  team: Team;
}) {
  const threshold = THRESHOLDS[animal];
  const level = Math.floor(score / threshold);
  const progressPct = ((score % threshold) / threshold) * 100;
  const preview = previewSkill(gameState, team, animal);
  const hasEffect = preview.myScoreDelta > 0 || preview.oppScoreDelta > 0 || preview.extraDraws > 0;

  // 팀 패널이 overflow-y-auto라 absolute 툴팁은 스크롤 영역에 잘려 보이지 않는다.
  // 마우스를 올린 카드의 위치를 직접 측정해 position:fixed로 화면 위에 그린다.
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <div
      className="relative border border-gray-200 rounded-lg overflow-hidden bg-white"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipPos(null)}
    >
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

      {/* 호버 툴팁 — 스킬 설명 + 지금 고르면 얻을 기댓값 */}
      {tooltipPos && (
        <div
          className="w-52 pointer-events-none"
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, calc(-100% - 6px))',
            zIndex: 100,
          }}
        >
          <div className="bg-jungle-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl text-center">
            <p className="font-bold mb-1">{SKILL_TITLE[animal]} (Lv. {level})</p>
            <p className="leading-relaxed text-jungle-100">{describeSkill(animal, level)}</p>
            <p className={`mt-1 font-bold ${hasEffect ? 'text-amber-300' : 'text-gray-400'}`}>
              {preview.extraDraws > 0 && `다음 턴 카드 +${preview.extraDraws}회`}
              {preview.myScoreDelta > 0 && `내 점수 +${preview.myScoreDelta}점`}
              {preview.oppScoreDelta > 0 && `상대 점수 -${preview.oppScoreDelta}점`}
              {!hasEffect && '아직 레벨 0 (효과 없음)'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScorePanel({
  team,
  gameState,
  scoreFlash,
}: {
  team: Team;
  gameState: ClientGameState;
  scoreFlash: ReadonlyMap<string, number>;
}) {
  const scores = gameState.teams[team].scores;
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
          gameState={gameState}
          team={team}
        />
      ))}

      <div className="bg-jungle-50 border border-jungle-200 rounded-lg px-3 py-2 text-center mt-1">
        <p className="text-xs text-jungle-500">합계</p>
        <p className="text-2xl font-bold text-jungle-800 tabular-nums">{myTotal}</p>
      </div>
    </div>
  );
}
