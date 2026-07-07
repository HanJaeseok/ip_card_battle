import type { ClientGameState } from 'shared';
import { MAX_TURN } from 'shared';
import { TurnTimer } from './TurnTimer';

export function GameHeader({ gameState }: { gameState: ClientGameState }) {
  const teamLabel = gameState.activeTeam === 'A' ? '🟢 A팀' : '🔵 B팀';

  return (
    <header className="bg-jungle-800 text-white px-5 py-2.5 flex items-center gap-4 shadow-md shrink-0">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums">{gameState.turn}</span>
        <span className="text-jungle-300 text-sm">/ {MAX_TURN}턴</span>
      </div>

      <div className="text-sm text-jungle-200 hidden sm:block">
        {teamLabel}{' '}
        <span className="font-semibold text-white">{gameState.activePlayerNickname}</span> 차례
      </div>

      <div className="ml-auto">
        <TurnTimer deadline={gameState.turnDeadline} />
      </div>
    </header>
  );
}
