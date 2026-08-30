import { initGame } from '../engine/turnManager';
import { drawCard } from '../engine/drawCard';
import { advanceTurn } from '../engine/turnManager';
import { processPlayerAction, processSkillChoice } from '../engine/gameEngine';
import { applySkillChoice, levelOf } from '../engine/skills';
import type { Animal, CardNum, StackedCard } from 'shared';
import { MAX_TURN, SHEEP_SAFETY_CAP, SKILL_COEFFICIENTS, THRESHOLDS } from 'shared';

// 결정론적 RNG (항상 0 반환 — Math.floor(rng()*n)은 항상 0번째 원소를 고른다)
const rng0 = () => 0;
// 옵션 2개짜리 장소에서 항상 마지막(1번째) 원소를 고르게 하는 RNG
const rngLast = () => 0.99;

let cardIdSeed = 0;
function stackedCard(animal: Animal, num: CardNum): StackedCard {
  return { id: ++cardIdSeed, animal, num, collectedBy: null };
}

// ─── 홀수 잔류 / 짝수 즉시 수집 ────────────────────────────────────────────────
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
    // dock은 2종 장소라 새로 뽑히는 카드 숫자는 1~5 중 rngLast로 고정된 5 → 기존 4 + 새 5 = 9
    expect(state.teams['A'].scores.tiger).toBe(9);
    expect(state.stacks.tiger.every(c => c.collectedBy === 'A')).toBe(true);
  });
});

// ─── 레벨 계산 ───────────────────────────────────────────────────────────────
describe('레벨 = floor(점수 / 임계값)', () => {
  it('양·토끼는 10점 단위, 인어·호랑이는 20점 단위', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 25;
    state.teams['A'].scores.rabbit = 9;
    state.teams['A'].scores.mermaid = 41;
    state.teams['A'].scores.tiger = 20;

    expect(levelOf(state, 'A', 'sheep')).toBe(2);
    expect(levelOf(state, 'A', 'rabbit')).toBe(0);
    expect(levelOf(state, 'A', 'mermaid')).toBe(2);
    expect(levelOf(state, 'A', 'tiger')).toBe(1);
  });
});

// ─── 스킬 선택 효과 ───────────────────────────────────────────────────────────
describe('스킬 선택 — 실용신양', () => {
  it('레벨만큼 다음 내 턴에 추가 뽑기를 예약하고, 즉시 점수 변화는 없다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 35; // level=3

    const ev = applySkillChoice(state, 'A', 'sheep');
    expect(ev.type).toBe('skillApplied');
    if (ev.type === 'skillApplied') {
      expect(ev.extraDrawsQueued).toBe(3);
      expect(ev.myScoreDelta).toBe(0);
      expect(ev.oppScoreDelta).toBe(0);
    }
    expect(state.teams['A'].pendingExtraDraws).toBe(3);
  });
});

describe('스킬 선택 — 상표토끼', () => {
  it('내 총점의 계수×레벨만큼 상표토끼 점수에 더해지고, 사용 통계가 기록된다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.rabbit = 20; // level=2, 정확히 배수라 초과분 없음
    state.teams['A'].scores.sheep = 30; // 총점 50

    const ev = applySkillChoice(state, 'A', 'rabbit');
    const expected = Math.round(50 * SKILL_COEFFICIENTS.rabbit * 2); // 5
    expect(ev.type === 'skillApplied' && ev.myScoreDelta).toBe(expected);
    // 사용한 레벨(2×10=20점)만 차감되고, 효과로 얻은 값이 그 위에 더해진다
    expect(state.teams['A'].scores.rabbit).toBe(expected);
    expect(state.teams['A'].skillStats.rabbit).toEqual({ count: 1, totalLevel: 2 });
  });

  it('임계값을 초과해 쌓아둔 점수는 사용 후에도 사라지지 않고 남는다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.rabbit = 25; // level=2(20점 사용), 초과분 5점
    state.teams['A'].scores.sheep = 30; // 총점 55

    const ev = applySkillChoice(state, 'A', 'rabbit');
    const expected = Math.round(55 * SKILL_COEFFICIENTS.rabbit * 2);
    expect(ev.type === 'skillApplied' && ev.myScoreDelta).toBe(expected);
    // 25 - (2×10) + 효과값 = 5(초과분) + 효과값 — 초과분이 사라지지 않아야 한다
    expect(state.teams['A'].scores.rabbit).toBe(5 + expected);
  });
});

describe('스킬 선택 — 디자인어', () => {
  it('상대와의 총점 차이의 계수×레벨만큼 획득 (뒤처져 있어도 앞서 있어도 동일 공식)', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.mermaid = 20; // level=1, A 총점=20, 정확히 배수라 초과분 없음
    state.teams['B'].scores.sheep = 100; // B 총점=100, 총점 차이 80

    const ev = applySkillChoice(state, 'A', 'mermaid');
    const expected = Math.round(80 * SKILL_COEFFICIENTS.mermaid * 1); // 8 (계수 10%)
    expect(ev.type === 'skillApplied' && ev.myScoreDelta).toBe(expected);
    // 사용한 레벨(1×20=20점)만 차감되고, 효과로 얻은 값이 그 위에 더해진다
    expect(state.teams['A'].scores.mermaid).toBe(expected);
    // 상대 점수는 건드리지 않는다(흡수가 아니라 그냥 획득)
    expect(state.teams['B'].scores.sheep).toBe(100);
  });
});

describe('스킬 선택 — 레벨 부족', () => {
  it('레벨이 0인 동물을 고르면 아무 효과도 없고 점수도 그대로다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    const ev = applySkillChoice(state, 'A', 'sheep');
    expect(ev.type === 'skillApplied' && ev.level).toBe(0);
    expect(state.teams['A'].scores.sheep).toBe(0);
    expect(state.teams['A'].skillStats.sheep).toEqual({ count: 0, totalLevel: 0 });
  });
});

describe('스킬 선택 — 특허랑이', () => {
  it('상대 총점의 계수×레벨만큼 상대 점수를 깎는다 (음수 방지)', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.tiger = 40; // level=2, 정확히 배수라 초과분 없음
    state.teams['B'].scores.sheep = 10;
    state.teams['B'].scores.rabbit = 10; // 총점 20

    const ev = applySkillChoice(state, 'A', 'tiger');
    const expectedLoss = Math.round(20 * SKILL_COEFFICIENTS.tiger * 2); // 2
    expect(ev.type === 'skillApplied' && ev.oppScoreDelta).toBe(expectedLoss);

    const remaining = state.teams['B'].scores.sheep + state.teams['B'].scores.rabbit;
    expect(remaining).toBe(20 - expectedLoss);
    expect(state.teams['B'].scores.sheep).toBeGreaterThanOrEqual(0);
    expect(state.teams['B'].scores.rabbit).toBeGreaterThanOrEqual(0);
    // 특허랑이 자신의 점수는 사용한 레벨(2×20=40점)만큼 차감된다(정확히 배수이므로 0)
    expect(state.teams['A'].scores.tiger).toBe(40 - 2 * THRESHOLDS.tiger);
  });

  it('레벨이 0이면(아직 임계값 미달) 아무 효과도 없다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['B'].scores.sheep = 50;

    const ev = applySkillChoice(state, 'A', 'tiger');
    expect(ev.type === 'skillApplied' && ev.oppScoreDelta).toBe(0);
    expect(state.teams['B'].scores.sheep).toBe(50);
  });
});

// ─── 실용신양 예약 뽑기 소모 ───────────────────────────────────────────────────
describe('실용신양 — 예약된 추가 뽑기 소모', () => {
  it('pendingExtraDraws만큼 이번 액션에서 추가로 뽑고 0으로 초기화된다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].pendingExtraDraws = 3;

    const events = drawCard(state, 'house', rng0);
    const bonus = events.find(e => e.type === 'bonusDraws');
    expect(bonus && bonus.type === 'bonusDraws' ? bonus.count : 0).toBe(3);

    const drawCount = events.filter(e => e.type === 'draw').length;
    expect(drawCount).toBe(4); // 예약 3장 + 이번 클릭 1장
    expect(state.teams['A'].pendingExtraDraws).toBe(0);
  });

  it(`SHEEP_SAFETY_CAP(${SHEEP_SAFETY_CAP})을 넘는 예약은 그 값에서 잘린다`, () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].pendingExtraDraws = SHEEP_SAFETY_CAP + 500;

    const events = drawCard(state, 'house', rng0);
    const bonus = events.find(e => e.type === 'bonusDraws');
    expect(bonus && bonus.type === 'bonusDraws' ? bonus.count : 0).toBe(SHEEP_SAFETY_CAP);
  });
});

// ─── 턴 진행 ─────────────────────────────────────────────────────────────────
describe('턴 진행', () => {
  it('B팀 플레이 후 턴 카운터 증가', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.activeTeam = 'B';
    advanceTurn(state);
    expect(state.turn).toBe(2);
  });

  it('A팀 플레이 후 턴 카운터 유지', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.activeTeam = 'A';
    advanceTurn(state);
    expect(state.turn).toBe(1);
  });

  it('MAX_TURN 초과 시 게임 종료', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.turn = MAX_TURN;
    state.activeTeam = 'B';
    const events = advanceTurn(state);
    expect(state.phase).toBe('ended');
    expect(events.some(e => e.type === 'gameEnd')).toBe(true);
  });
});

// ─── 카드 선택 ↔ 스킬 선택 대기 상태 ───────────────────────────────────────────
describe('장소 클릭 후에는 스킬을 고를 때까지 턴이 넘어가지 않는다', () => {
  it('processPlayerAction 직후 pendingChoice가 세팅되고 activeTeam은 그대로다 (고를 수 있는 스킬이 있을 때만)', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 10; // level=1이어야 고를 스킬이 있어 대기 상태가 된다
    const { state: s1 } = processPlayerAction(state, 'house', rng0);
    expect(s1.pendingChoice).toBe('A');
    expect(s1.activeTeam).toBe('A');
  });

  it('고를 수 있는 스킬이 하나도 없으면 대기하지 않고 즉시 자동 패스 후 턴이 넘어간다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    const { state: s1, events } = processPlayerAction(state, 'house', rng0);
    expect(s1.pendingChoice).toBeNull();
    expect(s1.activeTeam).toBe('B');
    const passEv = events.find(e => e.type === 'skillPassed');
    expect(passEv).toMatchObject({ type: 'skillPassed', team: 'A', auto: true });
  });

  it('pendingChoice가 있는 동안 추가 장소 클릭은 무시된다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 10;
    const { state: s1 } = processPlayerAction(state, 'house', rng0);
    const { events } = processPlayerAction(s1, 'house', rng0);
    expect(events).toHaveLength(0);
  });

  it('스킬을 고르면 pendingChoice가 풀리고 턴이 다음 팀으로 넘어간다', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.teams['A'].scores.sheep = 10; // level=1이어야 실제로 적용된다
    const { state: s1 } = processPlayerAction(state, 'house', rng0);
    const { state: s2, events } = processSkillChoice(s1, 'sheep');
    expect(s2.pendingChoice).toBeNull();
    expect(s2.activeTeam).toBe('B');
    expect(events.some(e => e.type === 'skillApplied')).toBe(true);
  });
});

// ─── 폭탄 ────────────────────────────────────────────────────────────────────
describe('폭탄 — EXPAND_TURN 이후에만 등장', () => {
  it('expanded=false면 폭탄이 절대 발생하지 않음', () => {
    const state = initGame(['A1'], ['B1'], rng0);
    state.expanded = false;
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

    // 0.01 < BOMB_BASE_CHANCE(0.3) → 폭탄. house=[rabbit, sheep] 중 인덱스 0=rabbit이 타깃.
    const events = drawCard(state, 'house', () => 0.01);
    const bombEv = events.find((e): e is Extract<typeof events[number], { type: 'bomb' }> => e.type === 'bomb');
    expect(bombEv).toBeDefined();
    expect(bombEv?.animal).toBe('rabbit');

    // 이미 획득된 기록은 남고, 미획득 카드만 사라진다.
    expect(state.stacks.rabbit).toHaveLength(1);
    expect(state.stacks.rabbit[0].collectedBy).toBe('A');
  });
});
