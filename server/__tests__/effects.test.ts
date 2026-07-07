import { initGame } from '../engine/turnManager';
import { openCard } from '../engine/openCard';
import { advanceTurn } from '../engine/turnManager';
import { applyRabbitEffect } from '../engine/effects/rabbit';
import { applyTigerEffect } from '../engine/effects/tiger';
import { applyMermaidEffect } from '../engine/effects/mermaid';
import { applySheepEffect } from '../engine/effects/sheep';
import { createBoard } from '../engine/board';
import type { Card, GameState } from 'shared';

// 결정론적 RNG (항상 0 반환)
const rng0 = () => 0;

/** 빈 보드에 특정 카드를 직접 배치하는 헬퍼 */
function makeState(cards: { key: string; card: Partial<Card> }[]): GameState {
  const state = initGame(['A1'], ['B1'], rng0);
  state.board.clear();
  for (const { key, card } of cards) {
    state.board.set(key, {
      animal: 'sheep',
      num: 1,
      open: false,
      collectedBy: null,
      ...card,
    });
  }
  return state;
}

// ─── 홀수 잔류 ───────────────────────────────────────────────────────────────
describe('홀수 잔류', () => {
  it('3장 오픈 시 아무것도 수집하지 않음', () => {
    const state = makeState([
      { key: '0,0', card: { animal: 'rabbit', num: 3, open: true } },
      { key: '0,1', card: { animal: 'rabbit', num: 2, open: true } },
      { key: '0,2', card: { animal: 'rabbit', num: 1, open: false } },
    ]);
    openCard(state, 0, 2, rng0);
    // 3장 → 홀수 → 수집 없음
    expect(state.teams['A'].scores.rabbit).toBe(0);
    for (const card of state.board.values()) {
      expect(card.collectedBy).toBeNull();
    }
  });

  it('짝수(2장) 오픈 시 즉시 수집', () => {
    const state = makeState([
      { key: '0,0', card: { animal: 'tiger', num: 4, open: true } },
      { key: '0,1', card: { animal: 'tiger', num: 6, open: false } },
    ]);
    openCard(state, 0, 1, rng0);
    expect(state.teams['A'].scores.tiger).toBe(10);
  });
});

// ─── 상표토끼 ─────────────────────────────────────────────────────────────────
describe('상표토끼 — 1회성 발동', () => {
  it('10점 도달 시 1회만 보너스, lastLevel 갱신으로 재발동 없음', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 5;
    state.teams['A'].scores.rabbit = 10;
    state.teams['A'].lastLevel.rabbit = 0;

    const events = applyRabbitEffect(state);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('rabbitBonus');

    const bonus = (events[0] as { type: 'rabbitBonus'; team: string; bonus: number }).bonus;
    // gained=1, turn=5 → bonus=5
    expect(bonus).toBe(5);
    expect(state.teams['A'].scores.rabbit).toBe(15);
    expect(state.teams['A'].lastLevel.rabbit).toBe(1);

    // 재호출 시 발동 없음
    const events2 = applyRabbitEffect(state);
    expect(events2).toHaveLength(0);
  });

  it('보너스 추가 후 lastLevel 갱신 (순서 검증)', () => {
    // rabbit 점수 19, 보너스로 20점이 되면 재발동하면 안 됨
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 1;
    state.teams['A'].scores.rabbit = 10;
    state.teams['A'].lastLevel.rabbit = 0;

    applyRabbitEffect(state); // bonus=1, 총 11점, lastLevel=1
    expect(state.teams['A'].lastLevel.rabbit).toBe(1);
    // 한 번 더 호출해도 발동 없음
    expect(applyRabbitEffect(state)).toHaveLength(0);
  });
});

// ─── 특허랑이 ─────────────────────────────────────────────────────────────────
describe('특허랑이 — 20점 단위 & min 0', () => {
  it('19점에서 미발동, 20점에서 발동', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 1;

    state.teams['A'].scores.tiger = 19;
    expect(applyTigerEffect(state)).toHaveLength(0);

    state.teams['A'].scores.tiger = 20;
    const events = applyTigerEffect(state);
    expect(events[0].type).toBe('tigerAttack');
  });

  it('상대 점수가 dmg보다 작아도 음수 미발생', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 10;
    state.teams['A'].scores.tiger = 20;
    state.teams['B'].scores.sheep = 2;
    state.teams['B'].scores.rabbit = 1;

    applyTigerEffect(state);
    expect(state.teams['B'].scores.sheep).toBeGreaterThanOrEqual(0);
    expect(state.teams['B'].scores.rabbit).toBeGreaterThanOrEqual(0);
  });

  it('dmg = round(gained × turn × 1.5)', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 4; // round(1 × 4 × 1.5) = 6
    state.teams['A'].scores.tiger = 20;
    state.teams['B'].scores.sheep = 100;
    state.teams['B'].scores.rabbit = 100;

    applyTigerEffect(state);
    expect(state.teams['B'].scores.sheep).toBe(94);
    expect(state.teams['B'].scores.rabbit).toBe(94);
  });
});

// ─── 디자인어 ─────────────────────────────────────────────────────────────────
describe('디자인어 — 캐치업/리드 분기', () => {
  it('뒤처진 팀 → 격차 50% 흡수', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 1;
    // A팀이 뒤처짐: A총점=20, B총점=60, gap=40, absorb=20
    state.teams['A'].scores.mermaid = 20;
    state.teams['B'].scores.mermaid = 60;
    state.teams['A'].lastLevel.mermaid = 0;

    const before = state.teams['B'].scores.mermaid;
    applyMermaidEffect(state);
    const absorb = before - state.teams['B'].scores.mermaid;
    expect(absorb).toBe(20); // gap(40) × 0.5
    expect(state.teams['A'].scores.mermaid).toBe(40); // 20 + 20
  });

  it('앞선 팀 → 소량 보너스만', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 3; // bonus = round(1 × 3 × 0.3) = 1
    state.teams['A'].scores.mermaid = 20;
    state.teams['B'].scores.mermaid = 0;
    state.teams['A'].lastLevel.mermaid = 0;

    const bBefore = state.teams['B'].scores.mermaid;
    applyMermaidEffect(state);
    expect(state.teams['B'].scores.mermaid).toBe(bBefore); // 상대 점수 변화 없음
    expect(state.teams['A'].scores.mermaid).toBeGreaterThan(20);
  });

  it('흡수량이 상대 총점 초과 시 클램핑', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 1;
    // A=20, B=5 → 뒤처짐, gap=15 * 상대 실제 보유량 5에서 클램핑
    state.teams['A'].scores.mermaid = 0;
    state.teams['B'].scores.mermaid = 5;
    state.teams['A'].scores.sheep = 20;
    state.teams['A'].lastLevel.mermaid = 0;

    applyMermaidEffect(state);
    // 상대 총점 이하로만 차감
    for (const animal of ['sheep', 'rabbit', 'mermaid', 'tiger'] as const) {
      expect(state.teams['B'].scores[animal]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── 실용신양 연쇄 cap ────────────────────────────────────────────────────────
describe('실용신양 — 연쇄 cap', () => {
  it('SHEEP_SAFETY_CAP(350) 이상 오픈 시도 시 350에서 중단', () => {
    // 보드에 카드 400장 (sheep 200장 포함) — 실제 구현에서는 초기 보드가 100장이므로
    // 여기서는 sheep 효과 발동 카운트를 측정하는 데 집중한다.
    const state = initGame(['A1'], ['B1'], rng0);
    // 보드를 400장으로 수동 세팅
    state.board.clear();
    for (let i = 0; i < 400; i++) {
      state.board.set(`${i},0`, {
        animal: 'sheep',
        num: 6,
        open: false,
        collectedBy: null,
      });
    }
    // sheep 점수를 매우 높게 설정해 n이 크도록
    state.teams['A'].scores.sheep = 3500; // level=350
    state.teams['A'].lastLevel.sheep = 0;

    const events = applySheepEffect(state, rng0);
    // sheepChain 이벤트의 count 합계가 350 이하여야 함
    const totalOpened = events
      .filter(e => e.type === 'sheepChain')
      .reduce((sum, e) => sum + (e as { type: 'sheepChain'; count: number }).count, 0);
    expect(totalOpened).toBeLessThanOrEqual(350);
  });
});

// ─── turnManager ─────────────────────────────────────────────────────────────
describe('턴 진행', () => {
  it('B팀 플레이 후 턴 카운터 증가', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.activeTeam = 'B';
    advanceTurn(state, rng0);
    expect(state.turn).toBe(2);
  });

  it('A팀 플레이 후 턴 카운터 유지', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.activeTeam = 'A';
    advanceTurn(state, rng0);
    expect(state.turn).toBe(1);
  });

  it('40턴 초과 시 게임 종료', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 40;
    state.activeTeam = 'B';
    const events = advanceTurn(state, rng0);
    expect(state.phase).toBe('ended');
    expect(events.some(e => e.type === 'gameEnd')).toBe(true);
  });

  it('전 카드 오픈 시 조기 종료', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    // 모든 카드를 오픈 상태로 설정
    for (const card of state.board.values()) {
      card.open = true;
    }
    state.turn = 5;
    state.activeTeam = 'B';
    const events = advanceTurn(state, rng0);
    expect(state.phase).toBe('ended');
    expect(events.some(e => e.type === 'gameEnd')).toBe(true);
  });
});
