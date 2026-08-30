'use client';

import { useMemo } from 'react';
import type { Animal, ClientGameState, Team } from 'shared';
import { ANIMALS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

const FLAVOR_TEXT: Record<Animal, string> = {
  sheep: '실용신안의 실리주의에 당하셨군요!',
  rabbit: '상표의 가치는 날로 강해지죠!',
  mermaid: '디자인과 벤치마킹, 그 경계는 어디일까요?',
  tiger: '가장 강력한 독점권을 행사하셨군요!',
};

/** 승리팀이 가장 크게 앞선 동물을 정규화 격차비율로 판정 (패배팀이 앞선 동물은 제외) */
function pickFlavorAnimal(gameState: ClientGameState, winner: Team | 'draw' | null): Animal | null {
  if (winner !== 'A' && winner !== 'B') return null;
  const loser: Team = winner === 'A' ? 'B' : 'A';

  let best: Animal | null = null;
  let bestGap = 0;
  for (const a of ANIMALS) {
    const w = gameState.teams[winner].scores[a];
    const l = gameState.teams[loser].scores[a];
    if (w < l) continue;
    const gap = (w - l) / (w + l || 1);
    if (gap > bestGap) {
      bestGap = gap;
      best = a;
    }
  }
  return best;
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  dur: number;
  delay: number;
  rot: number;
}

function generateConfetti(count: number, teamColor: string): ConfettiPiece[] {
  const palette =
    teamColor === 'A'
      ? ['#22c55e', '#86efac', '#bbf7d0', '#4ade80', '#fbbf24']
      : ['#3b82f6', '#93c5fd', '#bfdbfe', '#60a5fa', '#a78bfa'];

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (i * 7 + 13) % 95 + 2, // 2-97 vw
    color: palette[i % palette.length],
    dur: 1600 + ((i * 137) % 800),
    delay: (i * 60) % 1000,
    rot: 360 + ((i * 73) % 360),
  }));
}

export function GameEndScreen({
  gameState,
  onBack,
}: {
  gameState: ClientGameState;
  onBack: () => void;
}) {
  const { winner } = gameState;
  const scoreA = ANIMALS.reduce((s, a) => s + gameState.teams.A.scores[a], 0);
  const scoreB = ANIMALS.reduce((s, a) => s + gameState.teams.B.scores[a], 0);

  const confetti = useMemo(
    () => (winner && winner !== 'draw' ? generateConfetti(45, winner) : []),
    [winner],
  );

  const winnerEmoji = winner === 'draw' ? '🤝' : winner === 'A' ? '🟢' : '🔵';
  const winnerText = winner === 'draw' ? '무승부!' : `${winner}팀 승리!`;
  const flavorAnimal = useMemo(() => pickFlavorAnimal(gameState, winner), [gameState, winner]);

  return (
    <div className="min-h-screen bg-jungle-50 flex flex-col items-center justify-center gap-6 p-8 overflow-hidden relative">
      {/* 컨페티 */}
      {confetti.map(c => (
        <span
          key={c.id}
          className="confetti-piece"
          style={{
            left: `${c.x}vw`,
            top: '-20px',
            backgroundColor: c.color,
            '--cf-dur': `${c.dur}ms`,
            '--cf-delay': `${c.delay}ms`,
            '--cf-rot': `${c.rot}deg`,
          } as React.CSSProperties}
        />
      ))}

      {/* 승리 텍스트 */}
      <div className="winner-bounce-in flex flex-col items-center gap-3">
        {flavorAnimal && (winner === 'A' || winner === 'B') ? (
          <img
            src={`/skills/${flavorAnimal}_skill.png`}
            alt={ANIMAL_INFO[flavorAnimal].name}
            className="w-[40vw] h-[40vw] max-w-[440px] max-h-[440px] min-w-[200px] min-h-[200px] rounded-full object-cover shadow-xl"
            style={{
              border: `5px solid ${winner === 'A' ? '#22c55e' : '#3b82f6'}`,
            }}
          />
        ) : (
          <div style={{ fontSize: '5rem' }}>{winnerEmoji}</div>
        )}
        <h2 className="text-3xl font-bold text-jungle-900">{winnerText}</h2>
        {flavorAnimal && (
          <p className="text-sm text-jungle-500 -mt-1">{FLAVOR_TEXT[flavorAnimal]}</p>
        )}
      </div>

      {/* 점수표 */}
      <div
        className="bg-white rounded-2xl shadow-lg border border-jungle-200 p-6 w-full max-w-md"
        style={{ animation: 'bounceIn 0.7s cubic-bezier(0.36,0.07,0.19,0.97) 200ms both' }}
      >
        <div className="flex justify-between text-lg font-bold mb-5">
          <span
            className={`text-team-a ${winner === 'A' ? 'underline decoration-2' : 'opacity-60'}`}
          >
            🟢 A팀: {scoreA}점
          </span>
          <span
            className={`text-team-b ${winner === 'B' ? 'underline decoration-2' : 'opacity-60'}`}
          >
            🔵 B팀: {scoreB}점
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {ANIMALS.map(a => (
            <div key={a} className="flex items-center justify-between text-sm">
              <span className="text-jungle-700">
                {ANIMAL_INFO[a].emoji} {ANIMAL_INFO[a].name}
              </span>
              <div className="flex gap-4 tabular-nums font-mono">
                <span
                  className={`font-bold w-8 text-right ${
                    gameState.teams.A.scores[a] >= gameState.teams.B.scores[a]
                      ? 'text-team-a'
                      : 'text-jungle-400'
                  }`}
                >
                  {gameState.teams.A.scores[a]}
                </span>
                <span className="text-jungle-400">vs</span>
                <span
                  className={`font-bold w-8 ${
                    gameState.teams.B.scores[a] >= gameState.teams.A.scores[a]
                      ? 'text-team-b'
                      : 'text-jungle-400'
                  }`}
                >
                  {gameState.teams.B.scores[a]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onBack}
        className="bg-jungle-600 hover:bg-jungle-700 text-white font-semibold py-3 px-10 rounded-xl transition-colors shadow"
        style={{ animation: 'bounceIn 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 400ms both' }}
      >
        로비로 돌아가기
      </button>
    </div>
  );
}
