'use client';

import { useEffect, useState } from 'react';
import type { ClientGameState, Team } from 'shared';
import { WIN_HP } from 'shared';

// 팀 체력(=점수) — 아래가 0, 위가 WIN_HP인 유리구슬. 중간(시작값)부터 차오르거나
// 줄어든다. 상표토끼로 오르면 연두색 기운이 샤라락 훑고, 특허랑이에게 뺏기면
// 붉은 기운이 빠직! 하고 금 가며 구슬이 흔들리고 파편이 튄다.
export function TeamTotalPanel({
  team,
  gameState,
  isMine,
  pulse,
}: {
  team: Team;
  gameState: ClientGameState;
  isMine: boolean;
  pulse?: { id: number; direction: 'gain' | 'loss' } | null;
}) {
  const hp = gameState.teams[team].hp;
  const toneClass = isMine ? 'hp-orb-mine' : 'hp-orb-enemy';
  const fillPct = Math.max(0, Math.min(100, (hp / WIN_HP) * 100));

  const [activePulse, setActivePulse] = useState<{ id: number; direction: 'gain' | 'loss' } | null>(null);
  const [shards, setShards] = useState<{ dx: number; dy: number }[]>([]);

  useEffect(() => {
    if (!pulse) return;
    setActivePulse(pulse);
    if (pulse.direction === 'loss') {
      setShards(
        Array.from({ length: 6 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 30;
          return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
        }),
      );
    }
    const t = setTimeout(() => {
      setActivePulse(prev => (prev?.id === pulse.id ? null : prev));
      setShards([]);
    }, 700);
    return () => clearTimeout(t);
  }, [pulse]);

  return (
    <div className={`hp-orb w-56 shrink-0 h-full ${toneClass}`}>
      <div className="hp-orb-liquid" style={{ height: `${fillPct}%` }}>
        <div className="hp-orb-wave" />
      </div>
      <div className="hp-orb-sheen" />
      {activePulse?.direction === 'gain' && <div className="hp-orb-surge" />}
      {activePulse?.direction === 'loss' && (
        <>
          <div className="hp-orb-crack" />
          {shards.map((s, i) => (
            <span key={i} className="hp-orb-shard" style={{ '--shard-dx': `${s.dx}px`, '--shard-dy': `${s.dy}px` } as React.CSSProperties} />
          ))}
        </>
      )}
      <p className="hp-orb-value tabular-nums">{hp}</p>
    </div>
  );
}
