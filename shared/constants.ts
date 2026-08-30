export const THRESHOLDS = { sheep: 10, rabbit: 10, mermaid: 20, tiger: 20 } as const;

export const TIGER_COEF = 1.5;
export const MERMAID_CATCHUP_PCT = 0.5;
export const MERMAID_LEAD_BONUS_COEF = 0.3;

export const BOARD_INITIAL = 6;
export const BOARD_EXPANDED = 10;
export const EXPAND_TURN = 10;
export const MAX_TURN = 20;
export const TURN_TIME_SEC = 30;

// 실용신양 연쇄 오픈 안전 상한 (무한루프 방지)
export const SHEEP_SAFETY_CAP = 350;

export const CARDS_PER_ANIMAL_INIT = 9;  // 6×6 = 36칸 ÷ 4종
export const CARDS_PER_ANIMAL_EXP = 16;  // (10×10 - 6×6) = 64칸 ÷ 4종

export const ANIMALS = ['sheep', 'rabbit', 'mermaid', 'tiger'] as const;
