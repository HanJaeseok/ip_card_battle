import type { Animal, ClientGameState, Team } from 'shared';
import { ANIMALS } from 'shared';
import type { AnimationState } from '@/hooks/useAnimationQueue';
import { PlayerList } from './PlayerList';
import { ScorePanel } from './ScorePanel';

export function TeamPanel({
  team,
  myTeam,
  gameState,
  animState,
}: {
  team: Team;
  myTeam: Team | null;
  gameState: ClientGameState;
  animState: AnimationState;
}) {
  const teamState = gameState.teams[team];
  const opTeam: Team = team === 'A' ? 'B' : 'A';
  const opponentScores = gameState.teams[opTeam].scores;
  // 정산 연출이 끝날 때까지는 "화면상" 활성 팀(displayedActiveTeam)을 기준으로 삼는다 —
  // 실제 gameState.activeTeam은 액션 처리 즉시 다음 팀으로 넘어가 있기 때문.
  const isActiveTeam = animState.displayedActiveTeam === team;

  const teamColor = team === 'A' ? 'text-team-a' : 'text-team-b';
  const teamRing = isActiveTeam
    ? team === 'A'
      ? 'ring-2 ring-team-a shadow-lg'
      : 'ring-2 ring-team-b shadow-lg'
    : '';

  // 지금이 내 차례인지 상대 차례인지를 양쪽 팀 영역 배경색으로 동일하게 표시한다
  // (연두 = 내 차례, 연핑크 = 상대 차례) — A/B팀 색과는 별개의 전역 신호.
  const isMyTurn = myTeam !== null && animState.displayedActiveTeam === myTeam;
  const turnBgClass = myTeam === null ? 'bg-white' : isMyTurn ? 'bg-lime-100' : 'bg-rose-100';

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

  const boardTotals = ANIMALS.reduce((acc, a) => {
    acc[a] = gameState.stacks[a].filter(c => c.collectedBy === null).reduce((s, c) => s + c.num, 0);
    return acc;
  }, {} as Record<Animal, number>);

  return (
    <div
      className={`w-56 shrink-0 ${turnBgClass} rounded-2xl border border-jungle-200 p-4 flex flex-col gap-3 overflow-y-auto ${teamRing} transition-colors transition-shadow ${recoilClass} ${hitShakeClass} ${rabbitPressureClass}`}
    >
      <div className={`text-base font-bold ${teamColor}`}>{label}</div>

      <PlayerList
        team={team}
        members={teamState.members}
        activePlayerIndex={animState.displayedActivePlayerIndex}
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
        sheepReserveCount={animState.sheepReserve[team]}
        boardTotals={boardTotals}
      />
    </div>
  );
}
