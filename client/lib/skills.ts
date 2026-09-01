// 턴 종료 행동 선택의 "예상 효과" 미리보기 — 서버 engine/skills.ts와 동일한
// 공식을 클라이언트에서 그대로 복제한다(상태를 바꾸지 않는 순수 계산).
import { THRESHOLDS, MERMAID_MULTIPLIER_BASE } from 'shared';
import type { Animal, ClientGameState, Team } from 'shared';

export function levelOf(gameState: ClientGameState, team: Team, animal: Animal): number {
  return Math.floor(gameState.teams[team].exp[animal] / THRESHOLDS[animal]);
}

export interface SkillPreview {
  animal: Animal;
  level: number;
  myHpDelta: number;       // 내 체력 증감 — 항상 0 이상
  oppHpDelta: number;      // 상대 체력 증감 — 항상 0 이하(음수 그대로)
  extraDraws: number;
  multiplierAfter: number; // 인어를 고르면 발동 후 배율, 그 외엔 항상 1(발동하면 소모되므로)
}

export function previewSkill(gameState: ClientGameState, team: Team, animal: Animal): SkillPreview {
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const level = levelOf(gameState, team, animal);
  const mult = gameState.teams[team].pendingMultiplier;

  let myHpDelta = 0;
  let oppHpDelta = 0;
  let extraDraws = 0;
  let multiplierAfter = 1;

  if (animal === 'sheep') {
    extraDraws = level * mult;
  } else if (animal === 'rabbit') {
    myHpDelta = level * mult;
  } else if (animal === 'tiger') {
    const amount = level * mult;
    const steal = Math.min(amount, Math.max(0, gameState.teams[opponent].hp));
    oppHpDelta = -steal;
    myHpDelta = steal;
  } else if (animal === 'mermaid') {
    multiplierAfter = mult * MERMAID_MULTIPLIER_BASE ** level;
  }

  return { animal, level, myHpDelta, oppHpDelta, extraDraws, multiplierAfter };
}
