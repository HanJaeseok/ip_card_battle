import {
  ANIMALS,
  BOARD_INITIAL,
  BOARD_EXPANDED,
  CARDS_PER_ANIMAL_INIT,
  CARDS_PER_ANIMAL_EXP,
} from 'shared';
import type { Animal, Card, CardNum } from 'shared';

export type RNG = () => number;

export function shuffleArray<T>(arr: T[], rng: RNG = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomNum(rng: RNG): CardNum {
  return (Math.floor(rng() * 6) + 1) as CardNum;
}

function makeCards(animal: Animal, count: number, rng: RNG): Card[] {
  return Array.from({ length: count }, () => ({
    animal,
    num: randomNum(rng),
    open: false,
    collectedBy: null,
  }));
}

/** 10×10 초기 보드 생성 */
export function createBoard(rng: RNG = Math.random): Map<string, Card> {
  const cards: Card[] = [];
  for (const animal of ANIMALS) {
    cards.push(...makeCards(animal, CARDS_PER_ANIMAL_INIT, rng));
  }

  const shuffled = shuffleArray(cards, rng);
  const board = new Map<string, Card>();
  let idx = 0;
  for (let r = 0; r < BOARD_INITIAL; r++) {
    for (let c = 0; c < BOARD_INITIAL; c++) {
      board.set(`${r},${c}`, shuffled[idx++]);
    }
  }
  return board;
}

/**
 * 20턴 확장 시 14×14 외곽 링에 카드 추가.
 * 기존 좌표(0~9)는 유지, 외곽만 확장(-2~11 범위).
 */
export function createExpansionRing(board: Map<string, Card>, rng: RNG = Math.random): void {
  const newSize = BOARD_EXPANDED;
  const offset = Math.floor((newSize - BOARD_INITIAL) / 2); // 2
  const minCoord = -offset;               // -2
  const maxCoord = BOARD_INITIAL + offset - 1; // 11

  // 새 좌표 = 외곽 링 (기존 0~9 제외)
  const newKeys: string[] = [];
  for (let r = minCoord; r <= maxCoord; r++) {
    for (let c = minCoord; c <= maxCoord; c++) {
      if (r < 0 || r >= BOARD_INITIAL || c < 0 || c >= BOARD_INITIAL) {
        newKeys.push(`${r},${c}`);
      }
    }
  }

  // 96장 (4종 × 24장) 셔플 후 배치
  const cards: Card[] = [];
  for (const animal of ANIMALS) {
    cards.push(...makeCards(animal, CARDS_PER_ANIMAL_EXP, rng));
  }
  if (cards.length !== newKeys.length) {
    throw new Error(`확장 링 좌표(${newKeys.length})와 카드 수(${cards.length})가 다릅니다.`);
  }
  const shuffled = shuffleArray(cards, rng);
  shuffled.forEach((card, i) => board.set(newKeys[i], card));
}

/** 미오픈·미획득 카드의 좌표 목록 반환 */
export function getUnopenedKeys(board: Map<string, Card>): string[] {
  const result: string[] = [];
  for (const [key, card] of board) {
    if (!card.open && card.collectedBy === null) result.push(key);
  }
  return result;
}

/** 전 카드 오픈 여부 확인 */
export function allCardsOpened(board: Map<string, Card>): boolean {
  for (const card of board.values()) {
    if (!card.open) return false;
  }
  return true;
}
