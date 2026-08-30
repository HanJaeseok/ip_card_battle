import { ANIMALS, THRESHOLDS, SKILL_PCT_PER_LEVEL } from 'shared';
import type { Animal, GameEvent, GameState, Team } from 'shared';

/** 레벨 = floor(누적 점수 / 임계값). 임계값은 동물마다 다르다(양·토끼 10, 인어·호랑이 20). */
export function levelOf(state: GameState, team: Team, animal: Animal): number {
  return Math.floor(state.teams[team].scores[animal] / THRESHOLDS[animal]);
}

export function totalScore(state: GameState, team: Team): number {
  return ANIMALS.reduce((sum, a) => sum + state.teams[team].scores[a], 0);
}

/** 레벨이 1 이상이라 지금 고를 수 있는 동물 목록. */
export function eligibleAnimals(state: GameState, team: Team): Animal[] {
  return ANIMALS.filter(a => levelOf(state, team, a) > 0);
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
 * 턴을 마친 팀이 4가지 스킬 중 하나를 고르면 호출된다. 각 동물의 "레벨"(초기화 직전 값)을
 * 배율로 사용하며, 스킬을 고른 동물의 점수(경험치)는 발동 직후 항상 0으로 초기화된다.
 * - 🐑 실용신양: 다음 내 턴에 (레벨)회 추가로 뽑는다.
 * - 🐰 상표토끼: 내 총점의 `5% × 레벨` 만큼 상표토끼 점수에 더한다(초기화 후 다시 채워짐).
 * - 🧜‍♀️ 디자인어: 상대와의 총점 차이의 `5% × 레벨` 만큼 디자인어 점수에 더한다.
 * - 🐯 특허랑이: 상대 총점의 `5% × 레벨` 만큼 상대 점수를 깎는다.
 *
 * 레벨이 0인 동물을 골랐다면(정상적인 클라이언트라면 UI에서 막힘) 아무 일도 일어나지 않는다.
 */
export function applySkillChoice(state: GameState, team: Team, animal: Animal): GameEvent {
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const level = levelOf(state, team, animal);

  let myScoreDelta = 0;
  let oppScoreDelta = 0;
  let extraDrawsQueued = 0;

  if (level > 0) {
    if (animal === 'sheep') {
      extraDrawsQueued = level;
      state.teams[team].pendingExtraDraws = level;
    } else if (animal === 'rabbit') {
      myScoreDelta = Math.round(totalScore(state, team) * SKILL_PCT_PER_LEVEL * level);
    } else if (animal === 'mermaid') {
      const diff = Math.abs(totalScore(state, team) - totalScore(state, opponent));
      myScoreDelta = Math.round(diff * SKILL_PCT_PER_LEVEL * level);
    } else if (animal === 'tiger') {
      const loss = Math.round(totalScore(state, opponent) * SKILL_PCT_PER_LEVEL * level);
      distributeDeduct(state, opponent, loss);
      oppScoreDelta = loss;
    }

    // 레벨 초기화 — 스킬을 고른 동물의 에너지를 전부 소모한다. 효과로 얻은 점수(있다면)는
    // 방금 초기화된 그 버킷에 다시 쌓인다.
    state.teams[team].scores[animal] = myScoreDelta;

    const stat = state.teams[team].skillStats[animal];
    stat.count += 1;
    stat.totalLevel += level;
  }

  return { type: 'skillApplied', team, animal, level, myScoreDelta, oppScoreDelta, extraDrawsQueued };
}

/** 아무 스킬도 쓰지 않고 턴을 넘긴다. */
export function applyPass(team: Team): GameEvent {
  return { type: 'skillPassed', team };
}

/** 제한시간 내에 고르지 않으면 서버가 대신 무작위로 하나를 골라준다(고를 수 있는 게 없으면 null=패스). */
export function randomEligibleSkill(state: GameState, team: Team, rng: () => number = Math.random): Animal | null {
  const options = eligibleAnimals(state, team);
  if (options.length === 0) return null;
  return options[Math.floor(rng() * options.length)];
}
