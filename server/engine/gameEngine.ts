import type { GameEvent, GameState } from 'shared';
import { openCard } from './openCard';
import { advanceTurn, initGame } from './turnManager';
import type { RNG } from './board';

export { initGame } from './turnManager';

/**
 * 플레이어 액션 처리 — 엔진의 단일 진입점.
 * 카드 오픈 → 이펙트 → 턴 종료를 원자적으로 처리한다.
 *
 * @returns 변경된 state와 이벤트 배열 (클라이언트 연출 및 로깅용)
 */
export function processPlayerAction(
  state: GameState,
  r: number,
  c: number,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing') return { state, events: [] };

  const events: GameEvent[] = [];

  events.push(...openCard(state, r, c, rng));
  events.push(...advanceTurn(state, rng));

  return { state, events };
}

/**
 * 30초 타임아웃 강제진행 — 미오픈 카드 중 무작위 1장 선택.
 */
export function processTimeout(
  state: GameState,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing') return { state, events: [] };

  const unopened: string[] = [];
  for (const [key, card] of state.board) {
    if (!card.open && card.collectedBy === null) unopened.push(key);
  }
  if (unopened.length === 0) return { state, events: [] };

  const idx = Math.floor(rng() * unopened.length);
  const [rStr, cStr] = unopened[idx].split(',');
  return processPlayerAction(state, parseInt(rStr, 10), parseInt(cStr, 10), rng);
}
