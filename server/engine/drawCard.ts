import { bombChanceForTurn, PLACE_ANIMALS, ANIMALS } from 'shared';
import type { GameEvent, GameState, Place } from 'shared';
import { applySheepEffect } from './effects/sheep';
import { applyTigerEffect } from './effects/tiger';
import { applyMermaidEffect } from './effects/mermaid';
import { drawCardAt } from './places';
import type { RNG } from './places';

/**
 * 장소 클릭 처리 — 엔진의 단일 진입점.
 * 1) 클릭한 장소에서 카드 1장을 뽑는다(EXPAND_TURN 이후엔 BOMB_CHANCE 확률로 폭탄).
 * 2) 실용신양 상시효과 — 이 액션을 시작하는 시점의 실용신양 점수 기준으로
 *    floor(score/10)번 무작위 장소에서 추가로 뽑는다(정산 전이라 점수가 아직
 *    안 올랐으므로, 이 값은 액션 도중 다시 늘지 않는다 — 재귀 불필요).
 * 3) 이번 액션에서 뽑은 카드가 전부 모인 뒤, 동물별로 미획득 스택이 짝수 개면
 *    한꺼번에 수집하고 특허랑이·디자인어 즉시효과를 발동한다.
 */
export function drawCard(
  state: GameState,
  place: Place,
  rng: RNG = Math.random,
): GameEvent[] {
  const events: GameEvent[] = [];

  events.push(..._drawOne(state, place, rng));
  events.push(...applySheepEffect(state, rng));
  events.push(...settleStacks(state));

  return events;
}

/** 실용신양 효과 전용 — 정산 없이 카드 1장만 뽑아 스택에 쌓는다(폭탄 판정 포함). */
export function drawCardInternal(state: GameState, place: Place, rng: RNG): GameEvent[] {
  return _drawOne(state, place, rng);
}

function _drawOne(state: GameState, place: Place, rng: RNG): GameEvent[] {
  // EXPAND_TURN 이후에만 도토리 폭탄이 등장한다.
  if (state.expanded && rng() < bombChanceForTurn(state.turn)) {
    const options = PLACE_ANIMALS[place];
    const animal = options[Math.floor(rng() * options.length)];
    const stack = state.stacks[animal];
    const clearedCards = stack.filter(c => c.collectedBy === null);
    // 이미 획득된 카드(기록)는 남기고, 아직 못 먹은 카드만 날려버린다.
    state.stacks[animal] = stack.filter(c => c.collectedBy !== null);
    return [{ type: 'bomb', place, animal, clearedCards }];
  }

  const card = drawCardAt(place, rng);
  state.stacks[card.animal].push(card);
  return [{ type: 'draw', place, card }];
}

function settleStacks(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const team = state.activeTeam;

  for (const animal of ANIMALS) {
    const uncollected = state.stacks[animal].filter(c => c.collectedBy === null);
    if (uncollected.length === 0 || uncollected.length % 2 !== 0) continue;

    const scoreGain = uncollected.reduce((sum, c) => sum + c.num, 0);
    uncollected.forEach(c => { c.collectedBy = team; });
    state.teams[team].scores[animal] += scoreGain;

    events.push({
      type: 'collect',
      animal,
      team,
      score: scoreGain,
      cardIds: uncollected.map(c => c.id),
    });

    if (animal === 'tiger') events.push(...applyTigerEffect(state));
    if (animal === 'mermaid') events.push(...applyMermaidEffect(state));
  }

  return events;
}
