import { ANIMALS, THRESHOLDS, SKILL_PCT_PER_LEVEL } from 'shared';
import type { Animal, GameEvent, GameState, Team } from 'shared';

/** 레벨 = floor(누적 점수 / 임계값). 임계값은 동물마다 다르다(양·토끼 10, 인어·호랑이 20). */
export function levelOf(state: GameState, team: Team, animal: Animal): number {
  return Math.floor(state.teams[team].scores[animal] / THRESHOLDS[animal]);
}

export function totalScore(state: GameState, team: Team): number {
  return ANIMALS.reduce((sum, a) => sum + state.teams[team].scores[a], 0);
}

/** 상대 총점을 동물별 비중대로 차감한다 — 개별 동물 점수가 음수가 되지 않도록 안전하게 분배. */
function distributeDeduct(state: GameState, team: Team, amount: number): void {
  const scores = state.teams[team].scores;
  const total = totalScore(state, team);
  if (total <= 0 || amount <= 0) return;

  let remaining = Math.min(amount, total);
  const animals = [...ANIMALS];
  for (let i = 0; i < animals.length - 1; i++) {
    const a = animals[i];
    const cut = Math.round((scores[a] / total) * amount);
    const actual = Math.min(cut, scores[a], remaining);
    scores[a] -= actual;
    remaining -= actual;
  }
  const last = animals[animals.length - 1];
  scores[last] = Math.max(0, scores[last] - remaining);
}

/**
 * 턴을 마친 팀이 4가지 스킬 중 하나를 고르면 호출된다. 각 동물의 "레벨"을 배율로 사용한다.
 * - 🐑 실용신양: 다음 내 턴에 (레벨)회 추가로 뽑는다 — 즉시 점수 변화는 없다.
 * - 🐰 상표토끼: 내 총점의 `5% × 레벨` 만큼 상표토끼 점수에 더한다.
 * - 🧜‍♀️ 디자인어: 상대와의 총점 차이의 `5% × 레벨` 만큼 디자인어 점수에 더한다.
 * - 🐯 특허랑이: 상대 총점의 `5% × 레벨` 만큼 상대 점수를 깎는다.
 */
export function applySkillChoice(state: GameState, team: Team, animal: Animal): GameEvent {
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const level = levelOf(state, team, animal);

  let myScoreDelta = 0;
  let oppScoreDelta = 0;
  let extraDrawsQueued = 0;

  if (animal === 'sheep') {
    extraDrawsQueued = level;
    state.teams[team].pendingExtraDraws = level;
  } else if (animal === 'rabbit') {
    const gain = Math.round(totalScore(state, team) * SKILL_PCT_PER_LEVEL * level);
    state.teams[team].scores.rabbit += gain;
    myScoreDelta = gain;
  } else if (animal === 'mermaid') {
    const diff = Math.abs(totalScore(state, team) - totalScore(state, opponent));
    const gain = Math.round(diff * SKILL_PCT_PER_LEVEL * level);
    state.teams[team].scores.mermaid += gain;
    myScoreDelta = gain;
  } else if (animal === 'tiger') {
    const loss = Math.round(totalScore(state, opponent) * SKILL_PCT_PER_LEVEL * level);
    distributeDeduct(state, opponent, loss);
    oppScoreDelta = loss;
  }

  return { type: 'skillApplied', team, animal, myScoreDelta, oppScoreDelta, extraDrawsQueued };
}

/** 제한시간 내에 고르지 않으면 서버가 대신 무작위로 하나를 골라준다. */
export function randomSkillAnimal(rng: () => number = Math.random): Animal {
  return ANIMALS[Math.floor(rng() * ANIMALS.length)];
}
