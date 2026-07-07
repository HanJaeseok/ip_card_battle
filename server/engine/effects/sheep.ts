import { THRESHOLDS, SHEEP_SAFETY_CAP } from 'shared';
import type { GameEvent, GameState } from 'shared';
import { getUnopenedKeys, shuffleArray } from '../board';
import type { RNG } from '../board';
import { openCardInternal } from '../openCard';

/**
 * 실용신양 효과 — 큐 기반 연쇄 오픈.
 * 재귀 대신 while 루프로 구현해 스택오버플로우를 방지한다.
 *
 * 발동 기준: 자기 팀 sheep 점수가 10n 구간을 새로 넘을 때
 * 효과: n장 추가 오픈, 연쇄로 점수 오를 시 추가분 합산
 * 상한: SHEEP_SAFETY_CAP(350) 초과 시 강제 종료
 */
export function applySheepEffect(state: GameState, rng: RNG): GameEvent[] {
  const team = state.activeTeam;
  const teamState = state.teams[team];
  const events: GameEvent[] = [];

  const getLevel = () =>
    Math.floor(teamState.scores.sheep / THRESHOLDS.sheep);

  let newLevel = getLevel();
  let gained = newLevel - teamState.lastLevel.sheep;
  if (gained <= 0) return events;

  teamState.lastLevel.sheep = newLevel;
  let pendingOpens = gained;
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

    events.push({ type: 'sheepChain', count: toOpen, level: newLevel });

    const selected = shuffleArray(unopened, rng).slice(0, toOpen);
    for (const key of selected) {
      const subEvents = openCardInternal(state, key, rng);
      events.push(...subEvents);

      // 연쇄로 sheep 점수 오른 경우 pendingOpens에 증분 합산
      const currLevel = getLevel();
      const extra = currLevel - teamState.lastLevel.sheep;
      if (extra > 0) {
        pendingOpens += extra;
        newLevel = currLevel;
        teamState.lastLevel.sheep = currLevel;
      }
    }
  }

  return events;
}
