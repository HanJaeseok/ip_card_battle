import type { Animal } from 'shared';
import { ANIMALS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';
import { TigerAttackBar } from './TigerAttackBar';
import { MermaidExpectedBar } from './MermaidExpectedBar';

export function ScorePanel({
  scores,
  lastLevel,
  opponentScores,
  turn,
}: {
  scores: Record<Animal, number>;
  lastLevel: Record<Animal, number>;
  opponentScores: Record<Animal, number>;
  turn: number;
}) {
  const myTotal = ANIMALS.reduce((s, a) => s + scores[a], 0);
  const opTotal = ANIMALS.reduce((s, a) => s + opponentScores[a], 0);

  return (
    <div className="flex flex-col gap-3">
      {ANIMALS.map(a => (
        <div key={a}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{ANIMAL_INFO[a].emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-jungle-600 font-medium">{ANIMAL_INFO[a].name}</p>
              <p className="text-xl font-bold text-jungle-900 tabular-nums leading-tight">
                {scores[a]}
              </p>
            </div>
          </div>

          {a === 'tiger' && (
            <TigerAttackBar lastLevelTiger={lastLevel.tiger} turn={turn} />
          )}

          {a === 'mermaid' && (
            <MermaidExpectedBar myTotal={myTotal} opTotal={opTotal} turn={turn} />
          )}
        </div>
      ))}

      <div className="bg-jungle-50 border border-jungle-200 rounded-lg px-3 py-2 text-center mt-1">
        <p className="text-xs text-jungle-500">합계</p>
        <p className="text-2xl font-bold text-jungle-800 tabular-nums">{myTotal}</p>
      </div>
    </div>
  );
}
