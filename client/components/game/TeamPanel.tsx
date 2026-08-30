import type { ClientGameState, Team } from 'shared';
import type { AnimationState } from '@/hooks/useAnimationQueue';
import { PlayerList } from './PlayerList';
import { ScorePanel } from './ScorePanel';

export function TeamPanel({
  team,
  gameState,
  animState,
}: {
  team: Team;
  gameState: ClientGameState;
  animState: AnimationState;
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

  const tigerSlashActive = animState.tigerSlash?.onTeam === team;
  const tigerHitDmg = tigerSlashActive ? animState.tigerSlash!.dmg : null;
  const mermaidEffectType =
    animState.mermaidEffect?.team === team
      ? animState.mermaidEffect.type
      : null;

  // 공격자: 바깥으로 살짝 뺐다가 게임판 쪽으로 쿵 슬램.
  // 피격자: 충격이 전해진 듯 패널 전체가 들썩임 (AnimalTable 개별 들썩임은 ScorePanel에서 처리).
  const isAttacker = animState.tigerRecoil?.attackerTeam === team;
  const recoilClass = isAttacker ? (team === 'A' ? 'panel-recoil-a' : 'panel-recoil-b') : '';
  const hitShakeClass = tigerSlashActive ? 'panel-hit-shake' : '';
  const rabbitPressureClass = animState.rabbitPressure?.targetTeam === team ? 'panel-rabbit-pressure' : '';

  return (
    <div
      className={`w-56 shrink-0 bg-white rounded-2xl border border-jungle-200 p-4 flex flex-col gap-3 overflow-y-auto ${teamRing} transition-shadow ${recoilClass} ${hitShakeClass} ${rabbitPressureClass}`}
    >
      <div className={`text-base font-bold ${teamColor}`}>{label}</div>

      <PlayerList
        members={teamState.members}
        activePlayerIndex={gameState.activePlayerIndex}
        isActiveTeam={isActiveTeam}
      />

      <hr className="border-jungle-100" />

      <ScorePanel
        team={team}
        scores={teamState.scores}
        lastLevel={teamState.lastLevel}
        opponentScores={opponentScores}
        turn={gameState.turn}
        tigerSlashActive={tigerSlashActive}
        tigerHitDmg={tigerHitDmg}
        mermaidEffectType={mermaidEffectType}
        scoreFlash={animState.scoreFlash}
      />
    </div>
  );
}
