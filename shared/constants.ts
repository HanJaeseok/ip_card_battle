export const THRESHOLDS = { sheep: 10, rabbit: 10, mermaid: 20, tiger: 20 } as const;

export const TIGER_COEF = 1.5;
export const MERMAID_CATCHUP_PCT = 0.5;
export const MERMAID_LEAD_BONUS_COEF = 0.3;

export const BOARD_INITIAL = 10;
export const BOARD_EXPANDED = 14;
export const EXPAND_TURN = 20;
export const MAX_TURN = 40;
export const TURN_TIME_SEC = 30;

// 실용신양 연쇄 오픈 안전 상한 (무한루프 방지)
export const SHEEP_SAFETY_CAP = 350;

export const CARDS_PER_ANIMAL_INIT = 25;
export const CARDS_PER_ANIMAL_EXP = 24;

export const ANIMALS = ['sheep', 'rabbit', 'mermaid', 'tiger'] as const;
