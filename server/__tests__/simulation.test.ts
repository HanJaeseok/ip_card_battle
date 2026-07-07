import { initGame } from '../engine/turnManager';
import { processPlayerAction, processTimeout } from '../engine/gameEngine';
import type { GameState } from 'shared';
import { ANIMALS } from 'shared';

// ─── 시드 가능한 선형 합동 RNG ────────────────────────────────────────────────
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function totalScoreOf(state: GameState, team: 'A' | 'B'): number {
  return ANIMALS.reduce((sum, a) => sum + state.teams[team].scores[a], 0);
}

function getLeaderAt(state: GameState, targetTurn: number, history: Array<{ turn: number; aScore: number; bScore: number }>): 'A' | 'B' | 'tie' {
  const record = history.find(h => h.turn === targetTurn);
  if (!record) return 'tie';
  if (record.aScore > record.bScore) return 'A';
  if (record.bScore > record.aScore) return 'B';
  return 'tie';
}

/** 단일 게임 실행 후 결과 반환 */
function runGame(seed: number): {
  winner: 'A' | 'B' | 'draw';
  scores: { A: number; B: number };
  finalTurn: number;
  leader15: 'A' | 'B' | 'tie';
} {
  const rng = makeLCG(seed);
  const state = initGame(['botA'], ['botB'], rng);

  // 15턴 시점 리더 기록
  const history: Array<{ turn: number; aScore: number; bScore: number }> = [];

  let safetyCount = 0;
  while (state.phase === 'playing') {
    if (safetyCount++ > 100_000) {
      throw new Error(`시뮬레이션 무한루프 감지 (seed=${seed})`);
    }

    // 15턴 시점 스냅샷
    if (state.turn === 15 && !history.some(h => h.turn === 15)) {
      history.push({
        turn: 15,
        aScore: totalScoreOf(state, 'A'),
        bScore: totalScoreOf(state, 'B'),
      });
    }

    // 미오픈 카드 중 무작위 선택
    const unopened: string[] = [];
    for (const [key, card] of state.board) {
      if (!card.open && card.collectedBy === null) unopened.push(key);
    }

    if (unopened.length === 0) {
      // 오픈할 카드 없음 → 타임아웃으로 턴 강제 진행
      processTimeout(state, rng);
    } else {
      const idx = Math.floor(rng() * unopened.length);
      const [rStr, cStr] = unopened[idx].split(',');
      processPlayerAction(state, parseInt(rStr, 10), parseInt(cStr, 10), rng);
    }
  }

  const aFinal = totalScoreOf(state, 'A');
  const bFinal = totalScoreOf(state, 'B');

  return {
    winner: state.winner ?? 'draw',
    scores: { A: aFinal, B: bFinal },
    finalTurn: state.turn,
    leader15: getLeaderAt(state, 15, history),
  };
}

// ─── 시뮬레이션 테스트 ────────────────────────────────────────────────────────
describe('봇 대전 시뮬레이션 (500게임)', () => {
  const GAME_COUNT = 500;
  const results: ReturnType<typeof runGame>[] = [];

  beforeAll(() => {
    for (let seed = 1; seed <= GAME_COUNT; seed++) {
      results.push(runGame(seed));
    }
  }, 60_000);

  it('크래시·무한루프 없이 전 게임 완주', () => {
    expect(results).toHaveLength(GAME_COUNT);
  });

  it('모든 게임이 종료 상태', () => {
    // results가 있으면 모두 winner 값이 있음 (throw 없이 도달했으므로 통과)
    expect(results.every(r => r.winner !== undefined)).toBe(true);
  });

  it('평균 종료 턴이 20~41 범위 내', () => {
    // B팀이 40번째 턴을 마친 후 state.turn이 41로 증가되어 종료되므로 상한은 41
    const avgTurn = results.reduce((s, r) => s + r.finalTurn, 0) / GAME_COUNT;
    expect(avgTurn).toBeGreaterThanOrEqual(20);
    expect(avgTurn).toBeLessThanOrEqual(41);
  });

  it('15턴 리더 고착률 ≈ 59% (±10%)', () => {
    const validGames = results.filter(r => r.leader15 !== 'tie');
    if (validGames.length === 0) return; // 모두 동점이면 스킵

    const locked = validGames.filter(r => r.winner === r.leader15).length;
    const lockRate = locked / validGames.length;
    // 허용 범위: 49% ~ 69%
    expect(lockRate).toBeGreaterThanOrEqual(0.49);
    expect(lockRate).toBeLessThanOrEqual(0.69);
  });

  it('어느 한 팀이 90% 이상 독점하지 않음 (극단적 밸런스 붕괴 없음)', () => {
    // 메모리 게임 특성상 후공(B)은 선공(A)의 카드를 참고할 수 있어
    // 랜덤 봇에서도 후공 이점이 존재한다. 극단적 쏠림(>90%)만 방지한다.
    const aWins = results.filter(r => r.winner === 'A').length;
    const bWins = results.filter(r => r.winner === 'B').length;
    const aRate = aWins / GAME_COUNT;
    const bRate = bWins / GAME_COUNT;
    expect(aRate).toBeLessThan(0.90);
    expect(bRate).toBeLessThan(0.90);
  });
});
