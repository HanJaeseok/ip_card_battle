export const THRESHOLDS = { sheep: 10, rabbit: 10, mermaid: 20, tiger: 20 } as const;

export const TIGER_COEF = 1.5;
export const MERMAID_CATCHUP_PCT = 0.5;
export const MERMAID_LEAD_BONUS_COEF = 0.3;

export const EXPAND_TURN = 10; // 이 턴이 끝나면 더 신나지는 시점 — 이때부터 폭탄이 등장한다
export const MAX_TURN = 20;
export const TURN_TIME_SEC = 30;

// 실용신양 효과 1회 액션당 최대 뽑기 횟수 (무한루프/과도한 뽑기 방지)
export const SHEEP_SAFETY_CAP = 350;

// EXPAND_TURN 이후 카드를 뽑을 때마다 도토리 폭탄이 나올 확률.
// EXPAND_TURN+1턴(11턴)에 BOMB_BASE_CHANCE로 시작해 턴이 오를 때마다 BOMB_CHANCE_STEP씩 증가한다.
export const BOMB_BASE_CHANCE = 0.1;
export const BOMB_CHANCE_STEP = 0.05;

/** EXPAND_TURN+1턴(11턴)부터 도토리 폭탄이 등장할 확률(0~1). 서버·클라이언트가 동일하게 사용. */
export function bombChanceForTurn(turn: number): number {
  const turnsSinceStart = Math.max(0, turn - (EXPAND_TURN + 1));
  return Math.min(1, BOMB_BASE_CHANCE + BOMB_CHANCE_STEP * turnsSinceStart);
}

export const ANIMALS = ['sheep', 'rabbit', 'mermaid', 'tiger'] as const;
