'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClientBoardEntry } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

type FlipPhase = 'idle' | 'out' | 'in';

export function CardCell({
  entry,
  cardKey,
  isMyTurn,
  isSuppressed,
  isRecentlyOpened,
  reactionNum,
  isJolting,
  glowColor,
  isExpandedCell,
  onClick,
}: {
  entry: ClientBoardEntry | null;
  cardKey: string;
  isMyTurn: boolean;
  isSuppressed: boolean;
  isRecentlyOpened: boolean;
  reactionNum: number | null;
  isJolting: boolean;
  glowColor: string | null;
  isExpandedCell: boolean;
  onClick: (key: string) => void;
}) {
  const [flipPhase, setFlipPhase] = useState<FlipPhase>('idle');
  const prevSuppressedRef = useRef(isSuppressed);
  const flipTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // isSuppressed: true → false 전환 시 플립 트리거
  useEffect(() => {
    const wasSuppressed = prevSuppressedRef.current;
    prevSuppressedRef.current = isSuppressed;

    if (wasSuppressed && !isSuppressed) {
      flipTimers.current.forEach(clearTimeout);
      flipTimers.current = [];
      setFlipPhase('out');
      const t1 = setTimeout(() => setFlipPhase('in'), 125);
      const t2 = setTimeout(() => setFlipPhase('idle'), 305);
      flipTimers.current = [t1, t2];
    }
  }, [isSuppressed]);

  useEffect(
    () => () => flipTimers.current.forEach(clearTimeout),
    [],
  );

  if (!entry) {
    return <div className="w-11 h-14" />;
  }

  const { card } = entry;

  // 수집된 카드 — 사라지지 않고 팀 색으로 비활성화된 채 남는다 (글로우 중엔 앞면 유지)
  // collectedBy가 설정된 카드는 항상 open:true이지만(수집은 오픈된 카드만 가능),
  // ClientCard 유니온 타입상 card.open으로 한 번 더 좁혀야 animal/num에 접근 가능하다.
  if (card.collectedBy !== null && glowColor === null && card.open) {
    // 채도를 더 낮춘 팀 색 (거의 무채색에 가까운 회녹색 / 회남색)
    const teamBg = card.collectedBy === 'A' ? '#4b544e' : '#494d56';
    return (
      <div
        data-card-key={cardKey}
        className="card-shadow w-11 h-14 rounded-lg border border-black/20 flex flex-col items-center justify-center gap-0.5 cursor-not-allowed"
        style={{ backgroundColor: teamBg }}
      >
        <span className="text-base leading-none opacity-50">{ANIMAL_INFO[card.animal].emoji}</span>
        <span className="text-xs font-bold text-white/40 tabular-nums">{card.num}</span>
      </div>
    );
  }

  // ── 앞면 (오픈 + flip-in phase, 또는 페어 글로우 중) ────────────────────
  const showFront =
    glowColor !== null || (!isSuppressed && flipPhase !== 'out' && card.open);

  if (showFront && card.open) {
    const reaction = reactionNum !== null ? reactionNum : null;
    const isWink = reaction !== null && reaction >= 2;
    const isGold = reaction !== null && reaction === 6;

    // 짝을 못 찾고 남은 카드는 누가 열었는지와 무관하게 항상 중립 회색 테두리만 쓴다.
    // "이번 액션에서 새로 뒤집힌 카드"만 흰/검 강조 링으로 잠깐 구분해, 예전 턴 정보가
    // 계속 노출되지 않게 한다 (글로우 중엔 card-pair-glow가 테두리를 담당).
    const borderClass = 'border border-gray-300';
    const highlightClass = glowColor === null && isRecentlyOpened ? 'card-recent-open' : '';

    return (
      <div
        data-card-key={cardKey}
        className={`
          card-shadow w-11 h-14 rounded-lg bg-white ${borderClass} ${highlightClass}
          flex flex-col items-center justify-center gap-0.5
          relative overflow-visible select-none
          ${flipPhase === 'in' ? 'card-flip-in' : ''}
          ${isGold ? 'card-gold-flash' : ''}
          ${isJolting ? 'card-jolt' : ''}
          ${glowColor !== null ? 'card-pair-glow' : ''}
        `}
        style={glowColor !== null ? ({ '--pair-color': glowColor } as React.CSSProperties) : undefined}
      >
        <span
          className={`text-xl leading-none ${isWink ? 'card-wink' : ''}`}
        >
          {ANIMAL_INFO[card.animal].emoji}
        </span>
        <span className="text-sm font-bold text-jungle-800 tabular-nums">
          {card.num}
        </span>

        {/* 숫자 1 — 먼지 파티클 */}
        {reaction === 1 && (
          <DustParticles />
        )}
      </div>
    );
  }

  // ── 뒷면 (미오픈 or suppressed or flip-out) ──────────────────────────────
  const isFaceDown = isSuppressed || !card.open || flipPhase === 'out';
  if (isFaceDown) {
    const canClick = isMyTurn && !isSuppressed && !card.open;
    // 내 차례: 코팅된 것처럼 반짝이는 흰 카드로 클릭을 유도.
    // 상대 차례: 아무 효과 없는 옅은 회색으로 비활성 느낌만 준다.
    const bgClass = canClick
      ? isExpandedCell ? 'bg-gray-50' : 'bg-white'
      : isExpandedCell ? 'bg-gray-300' : 'bg-gray-200';
    const textClass = canClick ? 'text-gray-900' : 'text-gray-400';
    return (
      <button
        data-card-key={cardKey}
        onClick={() => canClick && onClick(cardKey)}
        disabled={!canClick}
        className={`
          card-shadow w-11 h-14 rounded-lg border border-gray-300 transition-all select-none
          ${bgClass} ${textClass}
          ${flipPhase === 'out' ? 'card-flip-out' : ''}
          ${isJolting && !isSuppressed ? 'card-jolt' : ''}
          ${canClick ? 'card-shiny hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-not-allowed'}
        `}
      >
        <span className="text-xs font-bold">?</span>
      </button>
    );
  }

  // 기본 fallback (shouldn't reach here)
  return <div className="w-11 h-14" />;
}

function DustParticles() {
  const positions = [
    { x: -8, y: -10 },
    { x: 10, y: -12 },
    { x: -12, y: 4 },
    { x: 8, y: 6 },
  ];
  return (
    <>
      {positions.map((pos, i) => (
        <span
          key={i}
          className="absolute text-xs pointer-events-none"
          style={{
            left: `calc(50% + ${pos.x}px)`,
            top: `calc(50% + ${pos.y}px)`,
            animation: `floatUp ${0.5 + i * 0.08}s ease-out ${i * 60}ms forwards`,
            opacity: 0.6,
            fontSize: '0.55rem',
            color: '#9ca3af',
          }}
        >
          ·
        </span>
      ))}
    </>
  );
}
