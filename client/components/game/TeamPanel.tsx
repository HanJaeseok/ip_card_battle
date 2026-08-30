import type { ClientGameState, Team } from 'shared';
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

  const teamEmoji = team === 'A' ? '🟢' : '🔵';
  const label = `${teamEmoji} ${gameState.teamNames[team]}`;
  const isMine = myTeam === team;

  // 타이거 스킬 연출 — 발동한 쪽은 반동(recoil), 맞는 쪽은 충격(hit shake)
  const recoilClass = animState.tigerRecoil?.attackerTeam === team ? (team === 'A' ? 'panel-recoil-a' : 'panel-recoil-b') : '';
  const hitShakeClass = animState.tigerSlash?.onTeam === team ? 'panel-hit-shake' : '';
  // 상표토끼 스킬 연출 — 날아온 토끼가 부딪히는 압박 효과
  const rabbitPressureClass = animState.rabbitPressure?.targetTeam === team ? 'panel-rabbit-pressure' : '';

  return (
    <div
      data-rabbit-target={team}
      className={`w-56 shrink-0 ${turnBgClass} rounded-2xl border border-jungle-200 p-4 flex flex-col gap-3 overflow-y-auto ${teamRing} ${recoilClass} ${hitShakeClass} ${rabbitPressureClass} transition-colors transition-shadow`}
    >
      <div className={`text-base font-bold ${teamColor} flex items-center gap-1.5`}>
        {label}
        {isMine && <span className="text-rose-500">우리팀♥</span>}
      </div>

      <PlayerList
        team={team}
        members={teamState.members}
        activePlayerIndex={animState.displayedActivePlayerIndex}
        isActiveTeam={isActiveTeam}
      />

      <hr className="border-jungle-100" />

      <ScorePanel
        team={team}
        gameState={gameState}
        scoreFlash={animState.scoreFlash}
      />
    </div>
  );
}
