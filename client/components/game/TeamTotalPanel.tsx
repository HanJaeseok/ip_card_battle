import type { ClientGameState, Team } from 'shared';
import { totalScore } from '@/lib/skills';

// 팀 합계 점수 — 우리팀은 연두색, 상대팀은 붉은색으로 고정 표시한다("합계"라는
// 라벨은 바로 위 해설판 안내 영역과 자리가 겹쳐 별도로 붙이지 않는다).
export function TeamTotalPanel({
  team,
  gameState,
  isMine,
}: {
  team: Team;
  gameState: ClientGameState;
  isMine: boolean;
}) {
  const total = totalScore(gameState, team);
  const toneClass = isMine ? 'score-total-mine' : 'score-total-enemy';

  return (
    <div className={`score-total w-56 shrink-0 h-full ${toneClass}`}>
      <p className="score-total-value tabular-nums">{total}</p>
    </div>
  );
}
