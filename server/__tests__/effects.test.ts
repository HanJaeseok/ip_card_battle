import { initGame } from '../engine/turnManager';
import { drawCard } from '../engine/drawCard';
import { advanceTurn } from '../engine/turnManager';
import { applyRabbitEffect } from '../engine/effects/rabbit';
import { applyTigerEffect } from '../engine/effects/tiger';
import { applyMermaidEffect } from '../engine/effects/mermaid';
import { applySheepEffect } from '../engine/effects/sheep';
import type { Animal, CardNum, StackedCard } from 'shared';
import { MAX_TURN, SHEEP_SAFETY_CAP } from 'shared';

// 결정론적 RNG (항상 0 반환 — Math.floor(rng()*n)은 항상 0번째 원소를 고른다)
const rng0 = () => 0;
// 옵션 2개짜리 장소에서 항상 마지막(1번째) 원소를 고르게 하는 RNG
const rngLast = () => 0.99;

let cardIdSeed = 0;
function stackedCard(animal: Animal, num: CardNum): StackedCard {
  return { id: ++cardIdSeed, animal, num, collectedBy: null };
}

// ─── 홀수 잔류 ───────────────────────────────────────────────────────────────
describe('홀수 잔류', () => {
  it('3장 스택 시 아무것도 수집하지 않음', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.stacks.rabbit.push(stackedCard('rabbit', 3), stackedCard('rabbit', 2));
    // house = [rabbit, sheep] — rng0는 항상 0번째(rabbit)를 뽑는다
    drawCard(state, 'house', rng0);
    // 2장 + 1장 = 3장(홀수) → 수집 없음
    expect(state.teams['A'].scores.rabbit).toBe(0);
    expect(state.stacks.rabbit.every(c => c.collectedBy === null)).toBe(true);
  });

  it('짝수(2장) 스택 시 즉시 수집', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.stacks.tiger.push(stackedCard('tiger', 4));
    // dock = [mermaid, tiger] — rngLast는 항상 마지막(tiger)을 뽑는다
    drawCard(state, 'dock', rngLast);
    // dock은 2종 장소라 새로 뽑히는 카드 숫자는 4~6 중 rngLast로 고정된 6 → 기존 4 + 새 6 = 10
    expect(state.teams['A'].scores.tiger).toBe(10);
    expect(state.stacks.tiger.every(c => c.collectedBy === 'A')).toBe(true);
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

  it('점수가 깎이면 lastLevel도 함께 낮춰서 재발동 가능해짐', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = 1;
    state.teams['A'].scores.tiger = 20; // gained=1, dmg=round(1*1*1.5)=2

    state.teams['B'].scores.rabbit = 5; // 공격 후 5-2=3, level 0
    state.teams['B'].lastLevel.rabbit = 2; // 과거 20점대에서 이미 보너스 받았던 상태

    applyTigerEffect(state);
    expect(state.teams['B'].scores.rabbit).toBe(3);
    expect(state.teams['B'].lastLevel.rabbit).toBe(0); // 현재 점수 수준으로 clamp됨

    // 이후 다시 25점까지 회복하면 보너스가 재발동해야 함
    state.teams['B'].scores.rabbit = 25;
    state.turn = 3;
    state.activeTeam = 'B';
    const events = applyRabbitEffect(state);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('rabbitBonus');
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

// ─── 실용신양 뽑기 상한 ────────────────────────────────────────────────────────
describe('실용신양 — 뽑기 상한', () => {
  it(`SHEEP_SAFETY_CAP(${SHEEP_SAFETY_CAP}) 이상 뽑기 시도 시 그 값에서 중단`, () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 3500; // level=350

    const events = applySheepEffect(state, rng0);
    const rollCount = events.find(e => e.type === 'sheepRoll');
    expect(rollCount && rollCount.type === 'sheepRoll' ? rollCount.count : 0).toBeLessThanOrEqual(SHEEP_SAFETY_CAP);
  });
});

describe('실용신양 — 상시효과 (lastLevel과 무관하게 현재 점수 기준)', () => {
  it('lastLevel이 얼마든 간에 floor(score/10)만큼 항상 뽑음', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 25; // level=2
    state.teams['A'].lastLevel.sheep = 10; // 과거 값이 남아 있어도 무시되어야 함

    const events = applySheepEffect(state, rng0);
    const roll = events.find(e => e.type === 'sheepRoll');
    expect(roll && roll.type === 'sheepRoll' ? roll.count : 0).toBe(2);
  });

  it('점수가 10 미만이면 발동하지 않음', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 9;
    expect(applySheepEffect(state, rng0)).toHaveLength(0);
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

  it('MAX_TURN 초과 시 게임 종료', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = MAX_TURN;
    state.activeTeam = 'B';
    const events = advanceTurn(state, rng0);
    expect(state.phase).toBe('ended');
    expect(events.some(e => e.type === 'gameEnd')).toBe(true);
  });
});

// ─── 폭탄 ────────────────────────────────────────────────────────────────────
describe('폭탄 — EXPAND_TURN 이후에만 등장', () => {
  it('expanded=false면 폭탄이 절대 발생하지 않음', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.expanded = false;
    // 0.01은 BOMB_CHANCE(0.3)보다 작지만, expanded가 false면 애초에 확률 판정을 안 한다.
    const events = drawCard(state, 'house', () => 0.01);
    expect(events.some(e => e.type === 'bomb')).toBe(false);
  });

  it('expanded=true & 확률 성공 시 폭탄 발생 — 해당 동물의 미획득 스택만 제거', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.expanded = true;
    state.stacks.rabbit.push(stackedCard('rabbit', 3));
    const alreadyCollected = stackedCard('rabbit', 5);
    alreadyCollected.collectedBy = 'A';
    state.stacks.rabbit.push(alreadyCollected);

    // 0.01 < BOMB_CHANCE(0.3) → 폭탄. house=[rabbit, sheep] 중 인덱스 0=rabbit이 타깃.
    const events = drawCard(state, 'house', () => 0.01);
    const bombEv = events.find((e): e is Extract<typeof events[number], { type: 'bomb' }> => e.type === 'bomb');
    expect(bombEv).toBeDefined();
    expect(bombEv?.animal).toBe('rabbit');

    // 이미 획득된 기록은 남고, 미획득 카드만 사라진다.
    expect(state.stacks.rabbit).toHaveLength(1);
    expect(state.stacks.rabbit[0].collectedBy).toBe('A');
  });
});
