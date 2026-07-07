import type { ClientGameState } from 'shared';
import { ANIMALS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

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

  const winnerEmoji = winner === 'draw' ? '🤝' : winner === 'A' ? '🟢' : '🔵';
  const winnerText = winner === 'draw' ? '무승부!' : `${winner}팀 승리!`;

  return (
    <div className="min-h-screen bg-jungle-50 flex flex-col items-center justify-center gap-6 p-8">
      <div style={{ fontSize: '5rem' }}>{winnerEmoji}</div>
      <h2 className="text-3xl font-bold text-jungle-900">{winnerText}</h2>

      <div className="bg-white rounded-2xl shadow-lg border border-jungle-200 p-6 w-full max-w-md">
        <div className="flex justify-between text-lg font-bold mb-5">
          <span className="text-team-a">🟢 A팀: {scoreA}점</span>
          <span className="text-team-b">🔵 B팀: {scoreB}점</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {ANIMALS.map(a => (
            <div key={a} className="flex items-center justify-between text-sm">
              <span className="text-jungle-700">
                {ANIMAL_INFO[a].emoji} {ANIMAL_INFO[a].name}
              </span>
              <div className="flex gap-4 tabular-nums font-mono">
                <span className="text-team-a font-bold w-8 text-right">
                  {gameState.teams.A.scores[a]}
                </span>
                <span className="text-jungle-400">vs</span>
                <span className="text-team-b font-bold w-8">
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
      >
        로비로 돌아가기
      </button>
    </div>
  );
}
