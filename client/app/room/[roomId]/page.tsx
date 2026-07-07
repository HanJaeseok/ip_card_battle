'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ClientBoardEntry, ClientGameState } from 'shared';
import { ANIMALS } from 'shared';
import { useWebSocket } from '@/hooks/useWebSocket';

// 동물 표시 이름 & 이모지
const ANIMAL_INFO = {
  sheep: { name: '실용신양', emoji: '🐑' },
  rabbit: { name: '상표토끼', emoji: '🐰' },
  mermaid: { name: '디자인어', emoji: '🧜‍♀️' },
  tiger: { name: '특허랑이', emoji: '🐯' },
} as const;

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const router = useRouter();
  const { gameState, openCard, error, connected } = useWebSocket();

  const handleCardClick = useCallback((key: string) => {
    const [r, c] = key.split(',').map(Number);
    openCard(r, c);
  }, [openCard]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-3">
        <p className="text-green-700">{connected ? '게임 상태 로딩 중...' : '서버에 연결 중...'}</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 underline mt-4">로비로 돌아가기</button>
      </div>
    );
  }

  if (gameState.phase === 'ended') {
    return <GameEndScreen gameState={gameState} onBack={() => router.push('/')} />;
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col">
      <Header gameState={gameState} />
      {error && (
        <div className="bg-red-100 text-red-700 text-sm text-center py-1 px-4">{error}</div>
      )}
      <div className="flex flex-1 gap-2 p-2 overflow-hidden">
        <TeamPanel team="A" gameState={gameState} />
        <BoardPanel gameState={gameState} onCardClick={handleCardClick} />
        <TeamPanel team="B" gameState={gameState} />
      </div>
    </div>
  );
}

// ─── 헤더 ────────────────────────────────────────────────────────────────────

function Header({ gameState }: { gameState: ClientGameState }) {
  return (
    <div className="bg-green-700 text-white px-4 py-2 flex items-center gap-4 shadow">
      <span className="font-bold text-lg">{gameState.turn} / 40턴</span>
      <span className="text-green-200 text-sm">
        {gameState.activeTeam === 'A' ? '🟢 A팀' : '🔵 B팀'} —{' '}
        <span className="font-semibold">{gameState.activePlayerNickname}</span> 차례
      </span>
      <div className="ml-auto">
        <TurnTimer deadline={gameState.turnDeadline} />
      </div>
    </div>
  );
}

// ─── 타이머 ──────────────────────────────────────────────────────────────────

function TurnTimer({ deadline }: { deadline: number }) {
  const [remaining, setRemaining] = React.useState(30);

  React.useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [deadline]);

  const pct = (remaining / 30) * 100;
  const isUrgent = remaining <= 5;

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <span className={isUrgent ? 'animate-bounce' : ''}>⏳</span>
      <div className="flex-1 bg-green-900 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${isUrgent ? 'bg-red-400' : 'bg-yellow-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-mono w-6 text-right ${isUrgent ? 'text-red-300 font-bold' : 'text-green-200'}`}>
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}

// ─── 팀 패널 ─────────────────────────────────────────────────────────────────

function TeamPanel({ team, gameState }: { team: 'A' | 'B'; gameState: ClientGameState }) {
  const teamState = gameState.teams[team];
  const isActive = gameState.activeTeam === team;
  const label = team === 'A' ? '🟢 A팀' : '🔵 B팀';
  const totalScore = ANIMALS.reduce((sum, a) => sum + teamState.scores[a], 0);

  return (
    <div className={`w-44 shrink-0 bg-white rounded-xl shadow p-3 flex flex-col gap-2 ${isActive ? 'ring-2 ring-green-500' : ''}`}>
      <div className="font-semibold text-gray-700 text-sm">{label}</div>

      {/* 팀원 목록 */}
      <div className="flex flex-col gap-0.5">
        {teamState.members.map((name, i) => {
          const isCurrentPlayer = isActive && i === gameState.activePlayerIndex;
          return (
            <div
              key={name}
              className={`text-xs px-2 py-0.5 rounded-full truncate ${
                isCurrentPlayer
                  ? 'bg-green-100 text-green-800 font-bold ring-1 ring-green-400'
                  : 'text-gray-500'
              }`}
            >
              {isCurrentPlayer ? '▶ ' : ''}{name}
            </div>
          );
        })}
      </div>

      <hr className="border-gray-100" />

      {/* 점수 */}
      <div className="flex flex-col gap-1">
        {ANIMALS.map(a => (
          <div key={a} className="flex items-center justify-between text-sm">
            <span>{ANIMAL_INFO[a].emoji} {ANIMAL_INFO[a].name}</span>
            <span className="font-mono font-bold text-gray-700">{teamState.scores[a]}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg px-2 py-1 text-center">
        <span className="text-xs text-gray-400">합계</span>
        <p className="font-bold text-lg text-green-700">{totalScore}</p>
      </div>
    </div>
  );
}

// ─── 카드 보드 ────────────────────────────────────────────────────────────────

function BoardPanel({
  gameState,
  onCardClick,
}: {
  gameState: ClientGameState;
  onCardClick: (key: string) => void;
}) {
  // 보드 범위 계산
  const entries = gameState.board;
  const coords = entries.map(e => e.key.split(',').map(Number));
  const minR = Math.min(...coords.map(([r]) => r));
  const maxR = Math.max(...coords.map(([r]) => r));
  const minC = Math.min(...coords.map(([, c]) => c));
  const maxC = Math.max(...coords.map(([, c]) => c));

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  // key → entry 맵
  const boardMap = new Map(entries.map(e => [e.key, e]));

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center">
      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }, (_, ri) =>
          Array.from({ length: cols }, (_, ci) => {
            const r = minR + ri;
            const c = minC + ci;
            const key = `${r},${c}`;
            const entry = boardMap.get(key);
            return (
              <CardCell
                key={key}
                entry={entry ?? null}
                cardKey={key}
                onClick={onCardClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── 카드 셀 ─────────────────────────────────────────────────────────────────

function CardCell({
  entry,
  cardKey,
  onClick,
}: {
  entry: ClientBoardEntry | null;
  cardKey: string;
  onClick: (key: string) => void;
}) {
  if (!entry) return <div className="w-10 h-12" />;

  const { card } = entry;
  const collected = card.collectedBy !== null;

  if (collected) {
    return (
      <div className="w-10 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center opacity-40">
        <span className="text-gray-300 text-xs">✓</span>
      </div>
    );
  }

  if (card.open) {
    return (
      <div className="w-10 h-12 rounded bg-white border-2 border-green-300 flex flex-col items-center justify-center shadow-sm">
        <span className="text-base leading-none">{ANIMAL_INFO[card.animal].emoji}</span>
        <span className="text-xs font-bold text-gray-700">{card.num}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onClick(cardKey)}
      className="w-10 h-12 rounded bg-green-700 hover:bg-green-600 border border-green-800 shadow-sm transition-colors active:scale-95"
    >
      <span className="text-green-400 text-xs">?</span>
    </button>
  );
}

// ─── 게임 종료 화면 ───────────────────────────────────────────────────────────

function GameEndScreen({ gameState, onBack }: { gameState: ClientGameState; onBack: () => void }) {
  const winner = gameState.winner;
  const scoreA = ANIMALS.reduce((s, a) => s + gameState.teams.A.scores[a], 0);
  const scoreB = ANIMALS.reduce((s, a) => s + gameState.teams.B.scores[a], 0);

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-5xl">
        {winner === 'draw' ? '🤝' : winner === 'A' ? '🟢' : '🔵'}
      </div>
      <h2 className="text-2xl font-bold text-gray-800">
        {winner === 'draw' ? '무승부!' : `${winner}팀 승리!`}
      </h2>
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        <div className="flex justify-between text-lg font-semibold mb-4">
          <span>🟢 A팀: {scoreA}점</span>
          <span>🔵 B팀: {scoreB}점</span>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {ANIMALS.map(a => (
            <div key={a} className="flex justify-between text-gray-600">
              <span>{ANIMAL_INFO[a].emoji} {ANIMAL_INFO[a].name}</span>
              <span>{gameState.teams.A.scores[a]} vs {gameState.teams.B.scores[a]}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onBack}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition"
      >
        로비로 돌아가기
      </button>
    </div>
  );
}

// React import (TurnTimer에서 React.useState/useEffect 사용)
import React from 'react';
