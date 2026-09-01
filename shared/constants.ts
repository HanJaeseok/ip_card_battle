// 동물별 레벨 임계값 — level = floor(exp / threshold)
export const THRESHOLDS = { sheep: 10, rabbit: 10, mermaid: 20, tiger: 20 } as const;

// 체력(=점수) 규칙 — 시작 체력은 목표 점수(GameSettings.targetScore) 그 자체이고,
// 그 두 배(=시작 체력 + 목표 점수)에 닿으면 즉시 승리, 0 이하면 즉시 패배다.
// 아래 INITIAL_HP/WIN_HP는 "기본 규칙(targetScore=5)일 때의 값"을 나타내는
// 참고용 상수일 뿐, 실제 게임 로직은 항상 state.settings.targetScore로 계산한다
// (server/engine/turnManager.ts의 winHpOf, initGame 참조).
export const INITIAL_HP = 5;
export const WIN_HP = 10;
export const LOSE_HP = 0;

// 축제 시작 턴(기본값) — 이후 모든 페어 수집 경험치가 이 배수만큼 커진다.
// 방장이 방 생성 시 바꿀 수 있다(GameSettings.festivalTurn) — "축제가 시작되는 첫 턴"이라
// turn >= festivalTurn으로 판정한다.
export const FESTIVAL_TURN = 10;
export const FESTIVAL_EXP_MULTIPLIER = 2;

// 방장이 방 생성 시 정할 수 있는 게임 규칙의 기본값 — GameSettings 참조.
// targetScore(목표 점수)의 기본값 5는 "체력 5에서 시작해 10 이상이면 즉시 승리"라는
// 기존 규칙과 정확히 일치한다(시작 체력 = targetScore, winHp = targetScore × 2).
export const DEFAULT_TARGET_SCORE = 5;
export const DEFAULT_FESTIVAL_TURN = FESTIVAL_TURN;
export const DEFAULT_DRAW_TIME_SEC = 30;
export const DEFAULT_ACTION_TIME_SEC = 15;
export const DEFAULT_NO_ACTION_TIME_SEC = 5;

// 방 생성 화면에서 입력값을 이 범위로 잘라낸다(서버도 방어적으로 다시 clamp한다).
export const SETTINGS_LIMITS = {
  targetScore: { min: 1, max: 30 },
  festivalTurn: { min: 1, max: 20 }, // MAX_TURN(20)을 넘기면 축제가 아예 시작되지 않는다
  drawTimeSec: { min: 5, max: 120 },
  actionTimeSec: { min: 5, max: 60 },
  noActionTimeSec: { min: 2, max: 30 },
} as const;

export const DEFAULT_SETTINGS = {
  targetScore: DEFAULT_TARGET_SCORE,
  festivalTurn: DEFAULT_FESTIVAL_TURN,
  drawTimeSec: DEFAULT_DRAW_TIME_SEC,
  actionTimeSec: DEFAULT_ACTION_TIME_SEC,
  noActionTimeSec: DEFAULT_NO_ACTION_TIME_SEC,
};

/** 방장 입력값을 SETTINGS_LIMITS 범위로 잘라내고, 정수가 아니면 반올림한다. */
export function clampSettings(input: Partial<typeof DEFAULT_SETTINGS> | undefined): typeof DEFAULT_SETTINGS {
  const merged = { ...DEFAULT_SETTINGS, ...input };
  const clamp = (key: keyof typeof SETTINGS_LIMITS) => {
    const { min, max } = SETTINGS_LIMITS[key];
    const v = Math.round(Number(merged[key]));
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : DEFAULT_SETTINGS[key];
  };
  return {
    targetScore: clamp('targetScore'),
    festivalTurn: clamp('festivalTurn'),
    drawTimeSec: clamp('drawTimeSec'),
    actionTimeSec: clamp('actionTimeSec'),
    noActionTimeSec: clamp('noActionTimeSec'),
  };
}

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
