import type { ClientGameState, Team } from 'shared';
import { MAX_TURN, bombChanceForTurn } from 'shared';
import { TurnTimer } from './TurnTimer';

export function GameHeader({
  gameState,
  displayedActiveTeam,
  displayedActivePlayerIndex,
  isSettling,
}: {
  gameState: ClientGameState;
  displayedActiveTeam: Team;
  displayedActivePlayerIndex: number;
  isSettling: boolean;
}) {
  const teamLabel = `${displayedActiveTeam === 'A' ? '🟢' : '🔵'} ${gameState.teamNames[displayedActiveTeam]}`;
  const nickname = gameState.teams[displayedActiveTeam].members[displayedActivePlayerIndex] ?? '';
  const bombPct = gameState.expanded ? Math.round(bombChanceForTurn(gameState.turn) * 100) : null;

  // 이 상단 타이머는 "장소를 고를 차례"일 때만 보여준다 — 스킬을 고르는 동안은
  // 선택 모달에 별도의 30초 타이머가 있고(중복 표시 방지), 정산/효과 애니메이션이
  // 재생되는 동안은 아무것도 기다릴 게 없으므로 타이머 자체를 감춘다.
  const showDrawTimer = !isSettling && gameState.pendingChoice === null;
  const statusLabel = isSettling ? '정산 중...' : '스킬 선택 중...';

  return (
    <header className="relative bg-jungle-800 text-white px-5 py-2.5 flex items-center shadow-md shrink-0 min-h-[3.25rem]">
      <div className="text-sm text-jungle-200 hidden sm:block">
        {teamLabel} <span className="font-semibold text-white">{nickname}</span> 차례
      </div>

      {/* 나뭇잎 장식이 화면 좌우 모서리를 가리므로, 턴/타이머는 항상 잘 보이도록 중앙에 고정 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums whitespace-nowrap">
            {gameState.turn} / {MAX_TURN}턴
          </span>
          {showDrawTimer ? (
            <TurnTimer deadline={gameState.turnDeadline} paused={false} />
          ) : (
            <span className="text-xs text-jungle-300 whitespace-nowrap">{statusLabel}</span>
          )}
        </div>
        {bombPct !== null && (
          <span className="text-xs font-semibold text-amber-300 whitespace-nowrap">
            🌰 폭탄 {bombPct}% 확률로 폭파!
          </span>
        )}
      </div>
    </header>
  );
}
