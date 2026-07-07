import type { ClientGameState, Team } from 'shared';
import { ANIMALS } from 'shared';
import { PlayerList } from './PlayerList';
import { ScorePanel } from './ScorePanel';

export function TeamPanel({
  team,
  gameState,
}: {
  team: Team;
  gameState: ClientGameState;
}) {
  const teamState = gameState.teams[team];
  const opTeam: Team = team === 'A' ? 'B' : 'A';
  const opponentScores = gameState.teams[opTeam].scores;
  const isActiveTeam = gameState.activeTeam === team;

  const teamColor = team === 'A' ? 'text-team-a' : 'text-team-b';
  const teamRing = isActiveTeam
    ? team === 'A'
      ? 'ring-2 ring-team-a shadow-lg'
      : 'ring-2 ring-team-b shadow-lg'
    : '';

  const label = team === 'A' ? '🟢 A팀' : '🔵 B팀';

  return (
    <div
      className={`w-56 shrink-0 bg-white rounded-2xl border border-jungle-200 p-4 flex flex-col gap-3 overflow-y-auto ${teamRing} transition-shadow`}
    >
      {/* 팀 레이블 */}
      <div className={`text-base font-bold ${teamColor}`}>{label}</div>

      {/* 플레이어 목록 */}
      <PlayerList
        members={teamState.members}
        activePlayerIndex={gameState.activePlayerIndex}
        isActiveTeam={isActiveTeam}
      />

      <hr className="border-jungle-100" />

      {/* 점수 패널 */}
      <ScorePanel
        scores={teamState.scores}
        lastLevel={teamState.lastLevel}
        opponentScores={opponentScores}
        turn={gameState.turn}
      />
    </div>
  );
}
