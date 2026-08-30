// 팀 프로필 하단 게이지의 "예상 효과" 계산 — 서버 effects/*.ts와 동일한 공식을
// 클라이언트에서 그대로 복제해, 지금 카드판(중앙 스택)에 놓인 미획득 카드들을
// "지금 획득한다면" 어떤 효과가 발동할지 미리 보여준다.
import { THRESHOLDS, TIGER_COEF, MERMAID_CATCHUP_PCT, MERMAID_LEAD_BONUS_COEF } from 'shared';

function gainedLevel(score: number, boardTotal: number, lastLevel: number, threshold: number): number {
  const newLevel = Math.floor((score + boardTotal) / threshold);
  return Math.max(0, newLevel - lastLevel);
}

/** 실용신양은 lastLevel과 무관하게 매 액션 현재 점수 기준 floor(score/threshold)만큼 뽑는다. */
export function predictSheepRolls(score: number, boardTotal: number): number {
  const before = Math.floor(score / THRESHOLDS.sheep);
  const after = Math.floor((score + boardTotal) / THRESHOLDS.sheep);
  return Math.max(0, after - before);
}

export function predictRabbitBonus(score: number, boardTotal: number, lastLevel: number, turn: number): number {
  const gained = gainedLevel(score, boardTotal, lastLevel, THRESHOLDS.rabbit);
  return gained > 0 ? gained * turn : 0;
}

export function predictTigerDmg(score: number, boardTotal: number, lastLevel: number, turn: number): number {
  const gained = gainedLevel(score, boardTotal, lastLevel, THRESHOLDS.tiger);
  return gained > 0 ? Math.round(gained * turn * TIGER_COEF) : 0;
}

export function predictMermaid(
  score: number,
  boardTotal: number,
  lastLevel: number,
  turn: number,
  myTotal: number,
  opTotal: number,
): { type: 'catchup' | 'bonus'; value: number } | null {
  const gained = gainedLevel(score, boardTotal, lastLevel, THRESHOLDS.mermaid);
  if (gained <= 0) return null;

  const myTotalAfter = myTotal + boardTotal;
  if (myTotalAfter < opTotal) {
    const gap = opTotal - myTotalAfter;
    const absorb = Math.min(Math.round(gap * MERMAID_CATCHUP_PCT), opTotal);
    return { type: 'catchup', value: absorb };
  }
  const bonus = Math.round(gained * turn * MERMAID_LEAD_BONUS_COEF);
  return { type: 'bonus', value: bonus };
}
