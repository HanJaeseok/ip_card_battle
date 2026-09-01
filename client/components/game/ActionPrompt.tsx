'use client';

import type { GameSettings, Team } from 'shared';
import { TurnTimer } from './TurnTimer';

// 해설판 가운데에 얹히는 흰 배경(테두리 없음) 안내 오버레이 — 해설 텍스트와 겹치면
// 이 오버레이가 항상 위에 보인다. 카드를 뽑을 때도, 행동을 고를 때도 같은 자리·같은
// 컴포넌트(모래시계 타이머)를 재사용한다. 지금이 누구 차례인지에 따라 문구가 바뀐다:
//  - 상대 팀 차례 → "상대 턴이에요."
//  - 우리 팀 차례이지만 팀 내 다른 사람 차례 → "내 차례가 아니에요."
//  - 내가 카드를 뽑을 차례 → 모래시계 타이머(30초) + 안내 문구
//  - 내가 행동을 고를 차례 → 모래시계 타이머(고를 게 없으면 5초) + 안내 문구
export function ActionPrompt({
  myTeam,
  playerId,
  displayedActiveTeam,
  displayedActivePlayerIndex,
  memberIds,
  isMyDrawTurn,
  interactive,
  noEligible,
  turnDeadline,
  settings,
}: {
  myTeam: Team | null;
  playerId: string | null;
  displayedActiveTeam: Team;
  displayedActivePlayerIndex: number;
  memberIds: Record<Team, string[]>;
  isMyDrawTurn: boolean; // 정산이 끝난 상태에서 내가 장소를 고를 차례인지
  interactive: boolean; // 정산이 끝난 상태에서 내가 행동을 고를 차례인지
  noEligible: boolean;
  turnDeadline: number;
  settings: GameSettings;
}) {
  const isMyTeamTurn = myTeam !== null && displayedActiveTeam === myTeam;
  const isMyPlayerTurn =
    isMyTeamTurn && playerId !== null && memberIds[displayedActiveTeam]?.[displayedActivePlayerIndex] === playerId;

  let text: string | null = null;
  let showTimer = false;
  let urgent = false;

  if (!isMyTeamTurn) {
    text = '상대 턴이에요.';
  } else if (!isMyPlayerTurn) {
    text = '내 차례가 아니에요.';
  } else if (interactive) {
    text = noEligible ? '아쉽게도 IP 에너지가 부족해요. 턴을 종료해주세요.' : '이번 턴의 행동을 선택하세요!';
    showTimer = true;
    urgent = noEligible;
  } else if (isMyDrawTurn) {
    text = '장소를 클릭해 카드를 뽑으세요!';
    showTimer = true;
  }

  if (text === null) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-xl px-5 py-2 flex items-center gap-3 shadow-sm">
        {showTimer && (
          <div className="w-56 shrink-0">
            <TurnTimer
              deadline={turnDeadline}
              paused={false}
              maxSeconds={urgent ? settings.noActionTimeSec : interactive ? settings.actionTimeSec : settings.drawTimeSec}
            />
          </div>
        )}
        <p className={`font-bold whitespace-nowrap ${urgent ? 'text-amber-600' : 'text-jungle-700'}`}>{text}</p>
      </div>
    </div>
  );
}
