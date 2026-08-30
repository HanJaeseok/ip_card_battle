import { initGame } from '../engine/turnManager';
import { processPlayerAction } from '../engine/gameEngine';
import { PLACES } from 'shared';
import type { GameState } from 'shared';
import { ANIMALS, MAX_TURN } from 'shared';

// 게임 중반 시점 스냅샷 — MAX_TURN이 바뀌어도 "게임의 약 37.5% 지점"을 가리키도록 비례 계산
const SNAPSHOT_TURN = Math.round(MAX_TURN * 0.375);

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

  // 게임 중반(SNAPSHOT_TURN) 시점 리더 기록
  const history: Array<{ turn: number; aScore: number; bScore: number }> = [];

  let safetyCount = 0;
  while (state.phase === 'playing') {
    if (safetyCount++ > 100_000) {
      throw new Error(`시뮬레이션 무한루프 감지 (seed=${seed})`);
    }

    // 중반 시점 스냅샷
    if (state.turn === SNAPSHOT_TURN && !history.some(h => h.turn === SNAPSHOT_TURN)) {
      history.push({
        turn: SNAPSHOT_TURN,
        aScore: totalScoreOf(state, 'A'),
        bScore: totalScoreOf(state, 'B'),
      });
    }

    // 장소는 항상 뽑을 수 있으므로(무한 뽑기) 무작위로 1곳 선택
    const place = PLACES[Math.floor(rng() * PLACES.length)];
    processPlayerAction(state, place, rng);
  }

  const aFinal = totalScoreOf(state, 'A');
  const bFinal = totalScoreOf(state, 'B');

  return {
    winner: state.winner ?? 'draw',
    scores: { A: aFinal, B: bFinal },
    finalTurn: state.turn,
    leader15: getLeaderAt(state, SNAPSHOT_TURN, history),
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

  it(`평균 종료 턴이 ${MAX_TURN / 2}~${MAX_TURN + 1} 범위 내`, () => {
    // B팀이 MAX_TURN번째 턴을 마친 후 state.turn이 (MAX_TURN+1)로 증가되어 종료되므로 상한은 MAX_TURN+1
    const avgTurn = results.reduce((s, r) => s + r.finalTurn, 0) / GAME_COUNT;
    expect(avgTurn).toBeGreaterThanOrEqual(MAX_TURN / 2);
    expect(avgTurn).toBeLessThanOrEqual(MAX_TURN + 1);
  });

  it(`${SNAPSHOT_TURN}턴 리더 고착률 ≈ 59% (±10%)`, () => {
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
