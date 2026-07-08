import { THRESHOLDS, SHEEP_SAFETY_CAP } from 'shared';
import type { GameEvent, GameState } from 'shared';
import { getUnopenedKeys, shuffleArray } from '../board';
import type { RNG } from '../board';
import { openCardInternal } from '../openCard';

/**
 * 실용신양 효과 — 상시효과. 임계값을 "새로" 넘었는지와 무관하게, 매 턴(플레이어가
 * 카드를 열 때마다) 자기 팀의 현재 실용신양 점수 기준 레벨(n = floor(score/10))만큼
 * 항상 추가로 카드를 연다. 점수가 오르면 다음 턴 추가 오픈 수도 늘고, 특허랑이에게
 * 점수를 깎이면 다음 턴 추가 오픈 수도 즉시 줄어든다 — "질보다 양" 컨셉.
 *
 * lastLevel.sheep은 더 이상 참조하지 않는다(과거의 "새로 넘은 구간만 발동" 게이트용
 * 필드였으나, 이 효과는 이제 게이트 없이 항상 현재 레벨을 그대로 반영한다).
 *
 * 재귀 대신 while 루프로 구현해 스택오버플로우를 방지하고,
 * 연쇄 중 레벨이 더 오르면(추가로 오픈한 카드가 실용신양 매치를 만들면) 그만큼
 * 계속 이어서 연다. 상한: SHEEP_SAFETY_CAP(350) 초과 시 강제 종료.
 */
export function applySheepEffect(state: GameState, rng: RNG): GameEvent[] {
  const team = state.activeTeam;
  const teamState = state.teams[team];
  const events: GameEvent[] = [];

  const getLevel = () =>
    Math.floor(teamState.scores.sheep / THRESHOLDS.sheep);

  let pendingOpens = getLevel();
  if (pendingOpens <= 0) return events;

  let totalOpened = 0;

  while (pendingOpens > 0 && totalOpened < SHEEP_SAFETY_CAP) {
    const unopened = getUnopenedKeys(state.board);
    if (unopened.length === 0) break;

    const toOpen = Math.min(
      pendingOpens,
      unopened.length,
      SHEEP_SAFETY_CAP - totalOpened,
    );
    pendingOpens -= toOpen;
    totalOpened += toOpen;

    events.push({ type: 'sheepChain', count: toOpen, level: getLevel(), team });

    const selected = shuffleArray(unopened, rng).slice(0, toOpen);
    for (const key of selected) {
      const before = getLevel();
      const subEvents = openCardInternal(state, key, rng);
      events.push(...subEvents);

      // 연쇄 중 실용신양 매치로 레벨이 더 오르면 그 증가분만큼 추가로 큐에 쌓는다
      const after = getLevel();
      if (after > before) {
        pendingOpens += after - before;
      }
    }
  }

  return events;
}
