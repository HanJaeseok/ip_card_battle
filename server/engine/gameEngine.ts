import type { GameEvent, GameState, Place } from 'shared';
import { drawCard } from './drawCard';
import { advanceTurn, initGame } from './turnManager';
import { randomPlace } from './places';
import type { RNG } from './places';

export { initGame } from './turnManager';

/**
 * 플레이어 액션 처리 — 엔진의 단일 진입점.
 * 장소 클릭 → 뽑기(+실용신양 연쇄) → 정산 → 턴 종료를 원자적으로 처리한다.
 *
 * @returns 변경된 state와 이벤트 배열 (클라이언트 연출 및 로깅용)
 */
export function processPlayerAction(
  state: GameState,
  place: Place,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing') return { state, events: [] };

  const events: GameEvent[] = [];

  events.push(...drawCard(state, place, rng));
  events.push(...advanceTurn(state, rng));

  return { state, events };
}

/**
 * 30초 타임아웃 강제진행 — 무작위 장소 1곳을 클릭한 것으로 처리(뽑기는 항상 무한).
 */
export function processTimeout(
  state: GameState,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing') return { state, events: [] };

  return processPlayerAction(state, randomPlace(rng), rng);
}
