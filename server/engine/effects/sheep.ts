import { THRESHOLDS, SHEEP_SAFETY_CAP } from 'shared';
import type { GameEvent, GameState } from 'shared';
import { randomPlace } from '../places';
import type { RNG } from '../places';
import { drawCardInternal } from '../drawCard';

/**
 * 실용신양 효과 — 상시효과. 이 액션을 시작하는 시점의 실용신양 점수 기준
 * floor(score/10)번만큼 무작위 장소에서 카드를 추가로 뽑는다.
 *
 * 정산이 모든 뽑기가 끝난 뒤 한 번에 이루어지는 구조(drawCard.ts)이므로, 이
 * 뽑기 도중에는 점수가 절대 갱신되지 않는다 — 따라서 "뽑다가 점수가 올라
 * 더 뽑아야 하는" 재귀 상황 자체가 발생하지 않는다(예전 while 루프보다 단순).
 */
export function applySheepEffect(state: GameState, rng: RNG): GameEvent[] {
  const team = state.activeTeam;
  const level = Math.floor(state.teams[team].scores.sheep / THRESHOLDS.sheep);
  if (level <= 0) return [];

  const target = Math.min(level, SHEEP_SAFETY_CAP);
  const events: GameEvent[] = [];

  for (let i = 0; i < target; i++) {
    const place = randomPlace(rng);
    events.push(...drawCardInternal(state, place, rng));
  }

  events.unshift({ type: 'sheepRoll', count: target, team });
  return events;
}
