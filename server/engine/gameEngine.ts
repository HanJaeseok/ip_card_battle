import type { Animal, GameEvent, GameState, Place } from 'shared';
import { drawCard } from './drawCard';
import { advanceTurn, initGame } from './turnManager';
import { applySkillChoice, applyPass, randomEligibleSkill, levelOf, eligibleAnimals } from './skills';
import { randomPlace } from './places';
import type { RNG } from './places';

export { initGame } from './turnManager';

/**
 * 장소 클릭 처리 — 엔진의 진입점 ①.
 * 뽑기+정산까지 끝난 뒤, 그 팀이 고를 수 있는 스킬이 하나라도 있으면 고를 때까지 대기한다.
 * 고를 수 있는 스킬이 아예 없다면(레벨 0) 화면에 선택창을 띄워 왕복할 필요 없이 이 안에서
 * 곧바로 패스 처리하고 턴까지 넘긴다 — 그래야 매 턴 "레벨 부족" 왕복 때문에 방금 재생 중이던
 * 뽑기 애니메이션이 다음 액션에 의해 끊기는 일이 없다.
 */
export function processPlayerAction(
  state: GameState,
  place: Place,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing' || state.pendingChoice !== null) return { state, events: [] };

  const events: GameEvent[] = [];
  events.push(...drawCard(state, place, rng));

  if (state.phase === 'playing') {
    const team = state.activeTeam;
    if (eligibleAnimals(state, team).length > 0) {
      state.pendingChoice = team;
    } else {
      events.push(applyPass(team, true));
      events.push(...advanceTurn(state));
    }
  }

  return { state, events };
}

/**
 * 스킬 선택 처리 — 엔진의 진입점 ②.
 * 선택이 끝나야 비로소 턴이 다음 팀으로 넘어간다. 레벨이 0인 동물을 고르는 요청은 무시한다
 * (정상적인 클라이언트라면 UI에서 이미 막혀 있다).
 */
export function processSkillChoice(
  state: GameState,
  animal: Animal,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing' || state.pendingChoice === null) return { state, events: [] };
  if (levelOf(state, state.pendingChoice, animal) <= 0) return { state, events: [] };

  const team = state.pendingChoice;
  const events: GameEvent[] = [];
  events.push(applySkillChoice(state, team, animal));
  state.pendingChoice = null;
  events.push(...advanceTurn(state));

  return { state, events };
}

/** "아무것도 하지 않음" 처리 — 엔진의 진입점 ③. */
export function processPass(state: GameState): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing' || state.pendingChoice === null) return { state, events: [] };

  const team = state.pendingChoice;
  const events: GameEvent[] = [applyPass(team, false)];
  state.pendingChoice = null;
  events.push(...advanceTurn(state));

  return { state, events };
}

/** 30초 제한시간 초과 — 카드 선택 대기 중이면 무작위 장소를, 스킬 선택 대기 중이면 무작위 스킬(없으면 패스)을 대신 골라준다. */
export function processTimeout(
  state: GameState,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'playing') return { state, events: [] };

  if (state.pendingChoice !== null) {
    const team = state.pendingChoice;
    const animal = randomEligibleSkill(state, team, rng);
    const result = animal === null ? processPass(state) : processSkillChoice(state, animal);
    return { state: result.state, events: [{ type: 'timeoutChoice', animal }, ...result.events] };
  }

  return processPlayerAction(state, randomPlace(rng), rng);
}
