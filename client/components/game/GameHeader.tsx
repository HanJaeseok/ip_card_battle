import type { ClientGameState } from 'shared';
import { MAX_TURN } from 'shared';
import { TurnTimer } from './TurnTimer';

export function GameHeader({ gameState }: { gameState: ClientGameState }) {
  const teamLabel = gameState.activeTeam === 'A' ? '🟢 A팀' : '🔵 B팀';

  return (
    <header className="relative bg-jungle-800 text-white px-5 py-2.5 flex items-center shadow-md shrink-0">
      <div className="text-sm text-jungle-200 hidden sm:block">
        {teamLabel}{' '}
        <span className="font-semibold text-white">{gameState.activePlayerNickname}</span> 차례
      </div>

      {/* 나뭇잎 장식이 화면 좌우 모서리를 가리므로, 턴/타이머는 항상 잘 보이도록 중앙에 고정 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
        <span className="text-sm font-bold tabular-nums whitespace-nowrap">
          {gameState.turn} / {MAX_TURN}턴
        </span>
        <TurnTimer deadline={gameState.turnDeadline} />
      </div>
    </header>
  );
}
