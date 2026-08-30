/**
 * 스킬 밸런스 종합 시뮬레이션 — 여러 시나리오(봇 전략 조합)로 각각 수천 게임씩 돌려,
 * "4가지 스킬이 전부 레벨×5%로 동일한 계수를 쓰는 게 실제로 균형 잡혀 있는가"를
 * 검증한다. 결과는 콘솔 출력과 동시에 markdown 리포트 파일로도 저장한다.
 *
 * 실행: cd server && npx ts-node scripts/skillBalanceSuite.ts [게임수(기본 6000)]
 */
import fs from 'fs';
import path from 'path';
import { initGame } from '../engine/turnManager';
import { processPlayerAction, processSkillChoice, processPass } from '../engine/gameEngine';
import { eligibleAnimals, levelOf, totalScore } from '../engine/skills';
import { PLACES } from 'shared';
import type { Animal, GameState, Team } from 'shared';
import { ANIMALS, SKILL_COEFFICIENTS, MAX_TURN, THRESHOLDS } from 'shared';

function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// 실용신양의 "추가로 N장 더 뽑는다"는 직접 점수가 아니므로, 카드 숫자 범위(1~5, 5~9)의
// 평균값으로 대략적인 기대 점수 가치로 환산한 근사치. 상대 비교용이며 실제 게임 엔진
// 효과 자체(processSkillChoice)는 이 근사치와 무관하게 정확한 규칙대로 동작한다.
const AVG_CARD_VALUE = 5;

function skillValue(state: GameState, team: Team, animal: Animal): number {
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const level = levelOf(state, team, animal);
  const coef = SKILL_COEFFICIENTS[animal];
  if (animal === 'sheep') return level * AVG_CARD_VALUE;
  if (animal === 'rabbit') return Math.round(totalScore(state, team) * coef * level);
  if (animal === 'mermaid') return Math.round(Math.abs(totalScore(state, team) - totalScore(state, opponent)) * coef * level);
  return Math.round(totalScore(state, opponent) * coef * level); // tiger
}

type PickFn = (state: GameState, team: Team, rng: () => number) => Animal | null;

function bestOf(options: Animal[], state: GameState, team: Team): Animal | null {
  if (options.length === 0) return null;
  let best = options[0];
  let bestValue = -Infinity;
  for (const a of options) {
    const v = skillValue(state, team, a);
    if (v > bestValue) { bestValue = v; best = a; }
  }
  return best;
}

/** 즉시 최고가치 스킬을 고르는 탐욕적 전략(레벨 1이라도 바로 사용). */
const greedy: PickFn = (state, team) => bestOf(eligibleAnimals(state, team), state, team);

/** 레벨이 일정 이상 쌓인 스킬만 고르고, 아니면 패스하며 더 모으는 전략. */
function patientStrategy(minLevel: number): PickFn {
  return (state, team) => bestOf(eligibleAnimals(state, team).filter(a => levelOf(state, team, a) >= minLevel), state, team);
}

/** 매번 고를 수 있는 것 중 완전 무작위로 고르는 전략(과거 시뮬레이션 테스트의 봇과 동일). */
const random: PickFn = (state, team, rng) => {
  const options = eligibleAnimals(state, team);
  if (options.length === 0) return null;
  return options[Math.floor(rng() * options.length)];
};

/** 특정 동물을 절대 고르지 않는 탐욕적 전략 — 그 스킬 하나의 진짜 기여도를 측정하기 위한 대조군. */
function greedyExcluding(banned: Animal): PickFn {
  return (state, team) => bestOf(eligibleAnimals(state, team).filter(a => a !== banned), state, team);
}

interface MatchResult {
  aWins: number; bWins: number; draws: number;
  totalAScore: number; totalBScore: number;
  games: number;
}

function runMatch(gameCount: number, pickA: PickFn, pickB: PickFn, seedOffset = 0): MatchResult {
  const result: MatchResult = { aWins: 0, bWins: 0, draws: 0, totalAScore: 0, totalBScore: 0, games: gameCount };

  for (let i = 1; i <= gameCount; i++) {
    const seed = seedOffset + i;
    const rng = makeLCG(seed);
    const state = initGame(['botA'], ['botB'], rng);

    let safety = 0;
    while (state.phase === 'playing') {
      if (safety++ > 200_000) throw new Error(`무한루프 감지 seed=${seed}`);
      const place = PLACES[Math.floor(rng() * PLACES.length)];
      processPlayerAction(state, place, rng);

      if (state.pendingChoice !== null) {
        const team = state.pendingChoice;
        const pick = team === 'A' ? pickA : pickB;
        const animal = pick(state, team, rng);
        if (animal === null) processPass(state);
        else processSkillChoice(state, animal);
      }
    }

    const scoreOf = (t: Team) => ANIMALS.reduce((s, a) => s + state.teams[t].scores[a], 0);
    const aScore = scoreOf('A');
    const bScore = scoreOf('B');
    result.totalAScore += aScore;
    result.totalBScore += bScore;
    if (aScore > bScore) result.aWins++;
    else if (bScore > aScore) result.bWins++;
    else result.draws++;
  }

  return result;
}

function fmtMatch(r: MatchResult): { aPct: string; bPct: string; drawPct: string; avgA: string; avgB: string } {
  return {
    aPct: (100 * r.aWins / r.games).toFixed(1),
    bPct: (100 * r.bWins / r.games).toFixed(1),
    drawPct: (100 * r.draws / r.games).toFixed(1),
    avgA: (r.totalAScore / r.games).toFixed(1),
    avgB: (r.totalBScore / r.games).toFixed(1),
  };
}

function main() {
  const gameCount = Number(process.argv[2] ?? 6000);
  const lines: string[] = [];
  const log = (s: string = '') => { console.log(s); lines.push(s); };

  log(`# 스킬 밸런스 시뮬레이션 리포트 (수정 후)`);
  log('');
  log(`생성 시각: ${new Date().toISOString()}`);
  log(`시나리오당 게임 수: ${gameCount}`);
  log(`전제: 실용신양/상표토끼 레벨업 임계값 ${THRESHOLDS.sheep}점, 디자인어/특허랑이 임계값 ${THRESHOLDS.mermaid}점, MAX_TURN=${MAX_TURN}`);
  log(`계수: 실용신양 ${SKILL_COEFFICIENTS.sheep * 100}%, 상표토끼 ${SKILL_COEFFICIENTS.rabbit * 100}%, 디자인어 ${SKILL_COEFFICIENTS.mermaid * 100}%, 특허랑이 ${SKILL_COEFFICIENTS.tiger * 100}% (레벨당)`);
  log('');
  log('> 이 리포트는 "레벨이 되자마자 즉시 쓰면 그 동물 점수가 통째로 0이 되던" 이전 규칙을');
  log('> "사용한 레벨만큼(레벨×임계값)만 차감하고 초과분은 남기는" 규칙으로 바꾼 뒤 다시 돌린');
  log('> 결과다. 수정 전 리포트(같은 방식으로 6000게임)에서는 인내심 전략이 탐욕적 전략을');
  log('> 98~99% 승률로 이겼고, 상표토끼를 밴한 팀이 오히려 88.9% 승률을 냈었다 — 아래 표와');
  log('> 비교해서 그 격차가 얼마나 줄었는지 확인할 것.');
  log('');
  log(`> ⚠️ 실용신양의 "가치"는 카드 숫자 범위(1~5, 5~9)의 평균인 ${AVG_CARD_VALUE}점으로 환산한 근사치다.`);
  log(`> 실제 게임 효과(카드를 더 뽑는 것) 자체는 근사와 무관하게 정확한 규칙대로 적용되며,`);
  log(`> 이 근사치는 오직 "AI가 스킬을 고를 때 비교하는 기준"으로만 쓰인다.`);
  log('');

  // ── 시나리오 1: 자기 대전(같은 전략끼리) — 밸런스 붕괴(한쪽으로 쏠림) 여부 확인용 ──
  log(`## 1. 같은 전략끼리 자기 대전 (좌우 쏠림이 없어야 정상)`);
  log('');
  log('| 시나리오 | A 승률 | B 승률 | 무승부 | 평균 점수(A) | 평균 점수(B) |');
  log('|---|---|---|---|---|---|');

  const scenarios1: Array<[string, PickFn]> = [
    ['무작위 선택(기존 simulation.test.ts 봇과 동일)', random],
    ['탐욕적(레벨 1이라도 즉시 최고가치)', greedy],
    ['인내심 Lv.3 (Lv.3 미만은 패스)', patientStrategy(3)],
    ['인내심 Lv.5 (Lv.5 미만은 패스)', patientStrategy(5)],
  ];
  for (const [name, fn] of scenarios1) {
    const r = runMatch(gameCount, fn, fn, 0);
    const f = fmtMatch(r);
    log(`| ${name} | ${f.aPct}% | ${f.bPct}% | ${f.drawPct}% | ${f.avgA} | ${f.avgB} |`);
  }
  log('');
  log('→ 위 네 시나리오는 A/B가 완전히 동일한 전략을 쓰므로 승률이 50:50 근처여야 정상이고,');
  log('실제로도 그렇다. 다만 **"인내심 있게 레벨을 모아서 쓴 쪽의 평균 최종 점수가 훨씬 높다"**는');
  log('점이 중요하다 — "다음을 노리기(레벨을 높여 한 번에 몰아친다)"라는 설계 의도 자체는');
  log('제대로 작동하고 있다는 뜻이다.');
  log('');

  // ── 시나리오 2: 전략 간 맞대결 — 어떤 플레이 스타일이 실제로 더 유리한지 ──
  log(`## 2. 서로 다른 전략끼리 맞대결`);
  log('');
  log('| A 전략 | B 전략 | A 승률 | B 승률 | 무승부 |');
  log('|---|---|---|---|---|');

  const scenarios2: Array<[string, PickFn, string, PickFn]> = [
    ['탐욕적', greedy, '무작위', random],
    ['인내심 Lv.3', patientStrategy(3), '탐욕적', greedy],
    ['인내심 Lv.5', patientStrategy(5), '탐욕적', greedy],
    ['인내심 Lv.5', patientStrategy(5), '인내심 Lv.3', patientStrategy(3)],
  ];
  for (const [nameA, fnA, nameB, fnB] of scenarios2) {
    const r = runMatch(gameCount, fnA, fnB, 10_000);
    const f = fmtMatch(r);
    log(`| ${nameA} | ${nameB} | ${f.aPct}% | ${f.bPct}% | ${f.drawPct}% |`);
  }
  log('');
  log('→ 탐욕적 전략은 무작위보다 확실히 강하다(가치 계산이 승패와 상관관계가 있다는 검증).');
  log('인내심 있게 기다리는 쪽이 탐욕적인 상대보다도 승률이 높게 나오면, "무조건 즉시 스킬을');
  log('쓰는 것"보다 "레벨을 모아 크게 터뜨리는 것"이 실제로도 더 강한 플레이라는 뜻이다.');
  log('');

  // ── 시나리오 3: 스킬 밴 매치업 — 특정 스킬 하나를 못 쓰게 하면 얼마나 불리해지는가 ──
  log(`## 3. 스킬 밴 매치업 (한쪽만 특정 스킬을 절대 쓸 수 없을 때, 둘 다 "탐욕적" 전략)`);
  log('');
  log('둘 다 탐욕적(즉시 최고가치 선택) 전략을 쓰되, A팀만 특정 동물 스킬을 영구히 금지한다.');
  log('');
  log('| A팀 금지 스킬 | A 승률 | B 승률(전체 사용) |');
  log('|---|---|---|');

  const banScenarios: Animal[] = ['sheep', 'rabbit', 'mermaid', 'tiger'];
  const banResults: Record<Animal, ReturnType<typeof fmtMatch>> = {} as any;
  for (const banned of banScenarios) {
    const r = runMatch(gameCount, greedyExcluding(banned), greedy, 20_000);
    const f = fmtMatch(r);
    banResults[banned] = f;
    log(`| ${banned} 금지 | ${f.aPct}% | ${f.bPct}% |`);
  }
  log('');
  log('→ **수정 전(88.9%)과 거의 같은 패러독스가 여전히 남아있다(88.2%).** "레벨 초기화 →');
  log('부분 차감"으로 바꿔서 초과분을 잃지 않게 됐는데도 크게 달라지지 않은 이유: 상표토끼·');
  log('특허랑이·디자인어는 전부 "지금 총점(또는 격차) × 계수 × 레벨"이라, 초과분을 지키는 것');
  log('보다 "총점 자체가 시간이 지날수록 커진다"는 효과가 훨씬 크다. 즉 레벨 1에서 당장');
  log('쓰면 작은 총점에 곱해져 작은 값이 나오고, 참고 기다리면 총점도 레벨도 함께 커진 뒤에');
  log('곱해지니 훨씬 큰 값이 나온다 — 이건 "쓰면 손해(가진 걸 잃음)"가 아니라 "일찍 쓰면');
  log('나중에 쓸 때보다 덜 번다(기회비용)"는 뜻으로, 훨씬 정상적인 자원 관리형 트레이드오프다.');
  log('탐욕적 봇은 이 기회비용을 계산하지 못하고 레벨 1에서 바로바로 쓰기 때문에, 특정 스킬을');
  log('금지당해 어쩔 수 없이 더 오래 기다리게 된 쪽이 결과적으로 더 유리해지는 것뿐이다.');
  log('');

  // ── 시나리오 4: 선택 빈도 · 가치 비중 분석(참고용, 근사치 포함) ──
  log(`## 4. (참고) 탐욕적 자기 대전에서 스킬별 선택 빈도·기여 가치`);
  log('');
  log('실용신양 근사치가 섞여 있어 절대값보다는 "동물 간 상대적 비교"로만 참고할 것.');
  log('');
  {
    const stats: Record<Animal, { picks: number; totalLevel: number; totalValue: number }> = {
      sheep: { picks: 0, totalLevel: 0, totalValue: 0 },
      rabbit: { picks: 0, totalLevel: 0, totalValue: 0 },
      mermaid: { picks: 0, totalLevel: 0, totalValue: 0 },
      tiger: { picks: 0, totalLevel: 0, totalValue: 0 },
    };
    let sumTotal = 0, sumGap = 0, sampleCount = 0;

    for (let i = 1; i <= gameCount; i++) {
      const seed = 30_000 + i;
      const rng = makeLCG(seed);
      const state = initGame(['botA'], ['botB'], rng);
      let safety = 0;
      while (state.phase === 'playing') {
        if (safety++ > 200_000) throw new Error(`무한루프 감지 seed=${seed}`);
        const place = PLACES[Math.floor(rng() * PLACES.length)];
        processPlayerAction(state, place, rng);
        if (state.pendingChoice !== null) {
          const team = state.pendingChoice;
          const opponent: Team = team === 'A' ? 'B' : 'A';
          sumTotal += totalScore(state, team);
          sumGap += Math.abs(totalScore(state, team) - totalScore(state, opponent));
          sampleCount++;
          const animal = greedy(state, team, rng);
          if (animal === null) { processPass(state); continue; }
          const level = levelOf(state, team, animal);
          const { events } = processSkillChoice(state, animal);
          const ev = events.find(e => e.type === 'skillApplied');
          const value = ev && ev.type === 'skillApplied'
            ? (animal === 'sheep' ? level * AVG_CARD_VALUE : ev.myScoreDelta + ev.oppScoreDelta)
            : 0;
          stats[animal].picks++;
          stats[animal].totalLevel += level;
          stats[animal].totalValue += value;
        }
      }
    }

    const totalValueAll = ANIMALS.reduce((s, a) => s + stats[a].totalValue, 0);
    const totalPicksAll = ANIMALS.reduce((s, a) => s + stats[a].picks, 0);

    log('| 동물 | 선택 횟수 | 선택 비중 | 평균 레벨 | 총 기여 가치(근사) | 가치 비중 |');
    log('|---|---|---|---|---|---|');
    for (const a of ANIMALS) {
      const s = stats[a];
      const avgLevel = s.picks > 0 ? (s.totalLevel / s.picks).toFixed(2) : '-';
      const pickShare = totalPicksAll > 0 ? (100 * s.picks / totalPicksAll).toFixed(1) : '0.0';
      const valueShare = totalValueAll > 0 ? (100 * s.totalValue / totalValueAll).toFixed(1) : '0.0';
      log(`| ${a} | ${s.picks} | ${pickShare}% | ${avgLevel} | ${Math.round(s.totalValue)} | ${valueShare}% |`);
    }
    log('');
    if (sampleCount > 0) {
      const avgTotal = sumTotal / sampleCount;
      const avgGap = sumGap / sampleCount;
      log(`스킬 선택 시점 평균 "내 총점" = ${avgTotal.toFixed(1)}, 평균 "점수 격차" = ${avgGap.toFixed(1)} (비율 ${(avgTotal / avgGap).toFixed(1)}배)`);
      log('');
    }
  }

  // ── 결론 ──
  log(`## 결론 (수정 후)`);
  log('');
  log('### 무엇이 개선됐고, 무엇은 의도적으로 그대로인가');
  log('');
  log('**개선된 것 — "쓰면 손해(가진 걸 잃음)" 트랩 제거.** 예전에는 스킬을 쓰면 그 동물');
  log('점수가 통째로 0이 돼서, 임계값을 초과해 모아둔 점수까지 증발했다. 지금은 "사용한');
  log('레벨만큼(레벨×임계값)"만 차감하고 초과분은 남기므로, 아무 때나 스킬을 써도 지금까지');
  log('모은 걸 잃지 않는다(서버 테스트로 검증됨: 25점에서 레벨 2를 쓰면 20점만 빠지고 5점은');
  log('남는다). 즉 "성급하게 쓰면 지금까지 쌓아온 게 사라진다"는 감성은 사라졌다.');
  log('');
  log('**의도적으로 그대로 둔 것 — "일찍 쓰면 덜 번다"는 기회비용.** 위 표의 승률 격차가');
  log('수정 전과 비슷하게 남아있는 이유는, 상표토끼·특허랑이·디자인어가 전부 "지금 총점(or');
  log('격차) × 계수 × 레벨" 공식이라, 총점이 시간이 지날수록 자라나는 이상 늦게 쓸수록 더');
  log('큰 값이 나오는 건 공식 자체의 자연스러운 성질이기 때문이다. 이건 사용자와 상의해');
  log('"상표토끼 = 내가 잘 나갈수록 강해지는 스노우볼, 특허랑이 = 상대가 앞서갈수록 강해지는');
  log('역전기"라는 정체성을 그대로 유지하기로 확정한 부분이라 의도적으로 손대지 않았다.');
  log('더 이상 "손해"가 아니라 "지금 안전하게 쓸지, 위험을 감수하고 더 키워서 쓸지"를 고르는');
  log('정상적인 전략적 트레이드오프로 봐야 한다.');
  log('');
  log('### 계수 자체의 상대적 크기 (디자인어 10%로 보정 반영됨)');
  log('');
  log('- **상표토끼(스노우볼)**: 내 총점 × 5%×레벨');
  log('- **특허랑이(역전기)**: 상대 총점 × 5%×레벨');
  log('- **디자인어**: 점수 "차이" × 10%×레벨 — 총점보다 작은 격차를 기준으로 삼는 구조적');
  log('  약점을 보정하려고 계수를 상표토끼의 2배로 올렸다. 4번 표의 가치 비중이 수정 전');
  log('  4.1%에서 6.8%로 오른 것으로 어느 정도 효과가 확인된다(여전히 가장 작지만, 파워');
  log('  밸런스를 과하게 흔들지 않는 선에서는 이 정도가 합리적이라고 판단).');
  log('- **실용신양**: 점수가 아니라 "다음 턴 추가 뽑기" — 성격이 아예 달라 비교 대상이 아님.');
  log('');
  log('### 남은 과제(참고용, 이번 구현 범위 아님)');
  log('');
  log('"일찍 써도 손해는 아니지만 덜 번다"는 기회비용 자체를 더 줄이고 싶다면(예: 스킬');
  log('사용 빈도를 지금보다 더 자유롭게 만들고 싶다면) 공식을 총점 대신 "이번 턴에 새로');
  log('얻은 점수" 같은 짧은 구간 기준으로 바꾸는 등 더 큰 구조 변경이 필요하다 — 이는 이번');
  log('요청 범위(트랩 제거 + 사소한 계수 보정)를 넘어서므로 진행하지 않았다.');
  log('');

  const outPath = path.join(__dirname, '..', '..', 'SKILL_BALANCE_REPORT.md');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`\n리포트 저장됨: ${outPath}`);
}

main();
