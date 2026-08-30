import { bombChanceForTurn, PLACE_ANIMALS, ANIMALS, SHEEP_SAFETY_CAP } from 'shared';
import type { GameEvent, GameState, Place } from 'shared';
import { drawCardAt, randomPlace } from './places';
import type { RNG } from './places';

/**
 * 장소 클릭 처리.
 * 1) 실용신양 스킬로 예약해둔 추가 뽑기가 있으면 먼저 전부 소모한다.
 * 2) 클릭한 장소에서 카드 1장을 뽑는다(EXPAND_TURN 이후엔 도토리 폭탄 확률 판정).
 * 3) 이번 액션에서 뽑은 카드가 전부 모인 뒤, 동물별로 미획득 스택이 짝수 개면 한꺼번에 수집한다.
 */
export function drawCard(
  state: GameState,
  place: Place,
  rng: RNG = Math.random,
): GameEvent[] {
  const events: GameEvent[] = [];

  events.push(...consumePendingExtraDraws(state, rng));
  events.push(..._drawOne(state, place, rng));
  events.push(...settleStacks(state));

  return events;
}

function consumePendingExtraDraws(state: GameState, rng: RNG): GameEvent[] {
  const team = state.activeTeam;
  const teamState = state.teams[team];
  const count = Math.min(teamState.pendingExtraDraws, SHEEP_SAFETY_CAP);
  teamState.pendingExtraDraws = 0;
  if (count <= 0) return [];

  const events: GameEvent[] = [{ type: 'bonusDraws', team, count }];
  for (let i = 0; i < count; i++) {
    events.push(..._drawOne(state, randomPlace(rng), rng));
  }
  return events;
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
  }

  return events;
}
