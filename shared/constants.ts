// 동물별 레벨 임계값 — level = floor(exp / threshold)
export const THRESHOLDS = { sheep: 10, rabbit: 10, mermaid: 20, tiger: 20 } as const;

// 체력(=점수) 규칙 — 5에서 시작해 10 이상이면 즉시 승리, 0 이하면 즉시 패배.
export const INITIAL_HP = 5;
export const WIN_HP = 10;
export const LOSE_HP = 0;

// 8턴 진입 시 축제 시작 — 이후 모든 페어 수집 경험치가 이 배수만큼 커진다.
export const FESTIVAL_TURN = 8; // "축제가 시작되는 첫 턴"이라 turn >= FESTIVAL_TURN으로 판정한다
export const FESTIVAL_EXP_MULTIPLIER = 2;

// 디자인어(인어) 스킬 — 대기 배율에 곱연산으로 누적된다: pendingMultiplier *= BASE ** level
export const MERMAID_MULTIPLIER_BASE = 2;

export const MAX_TURN = 20;
export const TURN_TIME_SEC = 30;

// 실용신양 스킬로 예약된 추가 뽑기 1회 소모당 상한 (무한루프/과도한 뽑기 방지)
export const SHEEP_SAFETY_CAP = 40;

export const ANIMALS = ['sheep', 'rabbit', 'mermaid', 'tiger'] as const;

// 방을 만들 때 팀 이름을 정하지 않으면 이 중 서로 겹치지 않게 무작위로 배정된다.
export const TEAM_NAME_POOL = [
  '상표', '디자인', '실용신안', '특허', '영업비밀', '저작권', '무단도용', '불법복제',
] as const;

// 실용신양 스킬로 예약된 추가 뽑기 1회당 턴 제한시간 연장(초) — 30초 + 10×n
export const SHEEP_EXTRA_TIME_PER_DRAW_SEC = 10;
// 배율이 실린 예약 뽑기가 턴 제한시간을 무한정 늘리지 않도록, 시간 연장 계산에는
// 이 값까지만 반영한다(실제 뽑기 횟수 자체는 SHEEP_SAFETY_CAP까지 그대로 진행된다).
export const SHEEP_TIMER_EXTRA_DRAW_CAP = 6;
