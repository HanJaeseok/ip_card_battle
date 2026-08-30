// 턴 종료 스킬 선택 모달의 "예상 효과" 미리보기 — 서버 engine/skills.ts와 동일한
// 공식을 클라이언트에서 그대로 복제한다(상태를 바꾸지 않는 순수 계산).
import { ANIMALS, THRESHOLDS, SKILL_COEFFICIENTS } from 'shared';
import type { Animal, ClientGameState, Team } from 'shared';

export function levelOf(gameState: ClientGameState, team: Team, animal: Animal): number {
  return Math.floor(gameState.teams[team].scores[animal] / THRESHOLDS[animal]);
}

export function totalScore(gameState: ClientGameState, team: Team): number {
  return ANIMALS.reduce((sum, a) => sum + gameState.teams[team].scores[a], 0);
}

export interface SkillPreview {
  animal: Animal;
  level: number;
  myScoreDelta: number;
  oppScoreDelta: number;
  extraDraws: number;
}

export function previewSkill(gameState: ClientGameState, team: Team, animal: Animal): SkillPreview {
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const level = levelOf(gameState, team, animal);

  let myScoreDelta = 0;
  let oppScoreDelta = 0;
  let extraDraws = 0;

  const coef = SKILL_COEFFICIENTS[animal];

  if (animal === 'sheep') {
    extraDraws = level;
  } else if (animal === 'rabbit') {
    myScoreDelta = Math.round(totalScore(gameState, team) * coef * level);
  } else if (animal === 'mermaid') {
    const diff = Math.abs(totalScore(gameState, team) - totalScore(gameState, opponent));
    myScoreDelta = Math.round(diff * coef * level);
  } else if (animal === 'tiger') {
    oppScoreDelta = Math.round(totalScore(gameState, opponent) * coef * level);
  }

  return { animal, level, myScoreDelta, oppScoreDelta, extraDraws };
}
