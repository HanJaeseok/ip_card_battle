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
      ? 'ring-[3px] ring-team-a shadow-lg'
      : 'ring-[3px] ring-team-b shadow-lg'
    : '';

  // 배경색은 "지금 누구 차례인지"가 아니라 "이 영역이 어느 팀인지"로 고정한다
  // (우리팀 = 연두, 상대팀 = 연붉은) — 차례 표시는 위 teamRing(테두리)만 담당한다.
  const isMine = myTeam === team;
  const bgClass = myTeam === null ? 'bg-white' : isMine ? 'bg-lime-100' : 'bg-rose-100';

  const teamEmoji = team === 'A' ? '🟢' : '🔵';
  const label = `${teamEmoji} ${gameState.teamNames[team]}`;

  // 타이거 스킬 연출 — 발동한 쪽은 반동(recoil), 맞는 쪽은 충격(hit shake)
  const recoilClass = animState.tigerRecoil?.attackerTeam === team ? (team === 'A' ? 'panel-recoil-a' : 'panel-recoil-b') : '';
  const hitShakeClass = animState.tigerSlash?.onTeam === team ? 'panel-hit-shake' : '';
  // 상표토끼 스킬 연출 — 날아온 토끼가 부딪히는 압박 효과
  const rabbitPressureClass = animState.rabbitPressure?.targetTeam === team ? 'panel-rabbit-pressure' : '';

  return (
    <div
      data-rabbit-target={team}
      className={`w-56 h-full min-h-0 shrink-0 ${bgClass} rounded-2xl border border-jungle-200 p-4 flex flex-col gap-3 overflow-y-auto ${teamRing} ${recoilClass} ${hitShakeClass} ${rabbitPressureClass} transition-colors transition-shadow`}
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
