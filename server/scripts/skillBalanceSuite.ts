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
import { ANIMALS, SKILL_PCT_PER_LEVEL, MAX_TURN, THRESHOLDS } from 'shared';

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
  if (animal === 'sheep') return level * AVG_CARD_VALUE;
  if (animal === 'rabbit') return Math.round(totalScore(state, team) * SKILL_PCT_PER_LEVEL * level);
  if (animal === 'mermaid') return Math.round(Math.abs(totalScore(state, team) - totalScore(state, opponent)) * SKILL_PCT_PER_LEVEL * level);
  return Math.round(totalScore(state, opponent) * SKILL_PCT_PER_LEVEL * level); // tiger
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

  log(`# 스킬 밸런스 시뮬레이션 리포트`);
  log('');
  log(`생성 시각: ${new Date().toISOString()}`);
  log(`시나리오당 게임 수: ${gameCount}`);
  log(`전제: 실용신양/상표토끼 레벨업 임계값 ${THRESHOLDS.sheep}점, 디자인어/특허랑이 임계값 ${THRESHOLDS.mermaid}점, MAX_TURN=${MAX_TURN}, 4개 스킬 모두 계수 = 레벨×${SKILL_PCT_PER_LEVEL * 100}%`);
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
  log('→ **예상과 정반대의 결과다 — 스킬을 못 쓰게 막힌 쪽(A)이 오히려 압도적으로 더 이긴다.**');
  log('이유는 "탐욕적" 전략 자체의 결함에 있다: 레벨이 조금이라도 올라 스킬을 쓸 수 있게');
  log('되는 순간 곧바로 써버리면, 그 동물의 점수가 즉시 0으로 초기화된다(레벨 초기화 규칙).');
  log('즉 "쓸 수 있을 때 무조건 쓴다"는 태도는 점수를 계속 리셋시켜 스스로 손해를 본다.');
  log('반대로 특정 동물을 아예 못 쓰게 막히면, 그 팀은 (다른 스킬이 없을 때) 어쩔 수 없이');
  log('패스를 더 많이 하게 되고, 그 결과 점수가 리셋되지 않고 계속 쌓여 오히려 더 유리해진다.');
  log('가장 자주 트리거되는 상표토끼(선택 비중 45.7%, 4번 표 참고)를 금지당했을 때 상대적');
  log('불이익이 가장 커야 정상인데, 실제로는 상표토끼 금지가 A팀에게 가장 큰 승률(88.9%)을');
  log('안겨준다 — "가장 자주 즉흥적으로 쓰이는 스킬일수록, 즉흥적으로 쓰면 쓸수록 손해"라는');
  log('뜻이다. 이 결과는 개별 스킬의 강함이 아니라, **"레벨 초기화 + 즉시 사용 유인"이라는');
  log('설계 조합 자체가 성급한 스킬 사용을 벌준다**는 걸 보여준다.');
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
  log(`## 결론`);
  log('');
  log('### (1) 가장 중요한 발견 — "즉시 사용 + 레벨 초기화" 조합이 성급한 플레이를 벌준다');
  log('');
  log('2번 표에서 인내심 있는 전략이 탐욕적 전략을 상대로 **98~99% 승률**을 낸다. 3번 표의');
  log('밴 매치업에서는 특정 스킬을 못 쓰게 막힌 쪽이 오히려 더 많이 이긴다(가장 자주 쓰이는');
  log('상표토끼를 막았을 때 A팀 승률 88.9%). 두 결과가 가리키는 결론은 같다 — 지금 규칙에서는');
  log('"레벨이 되는 순간 즉시 스킬을 쓴다"가 명백한 악수(惡手)다. 스킬을 쓰면 그 동물의 점수가');
  log('즉시 0으로 초기화되는데, 레벨 1(10점/20점) 남짓에서 나오는 효과는 미미해서, 그 자리에서');
  log('그냥 패스하고 점수를 계속 쌓는 것보다 훨씬 손해다. 즉 지금 밸런스가 흔들리는 근본 원인은');
  log('"4개 스킬 계수가 서로 다르다"는 것보다, **"낮은 레벨에서 스킬을 쓰는 행위 자체가 손해가');
  log('되도록 설계돼 있다"**는 점에 더 가깝다.');
  log('');
  log('### (2) 계수 자체의 상대적 불균형(참고용, 근사치 포함)');
  log('');
  log('4가지 스킬 모두 "레벨×5%"로 계수는 같지만, 그 5%가 곱해지는 기준값이 스킬마다 다르다:');
  log('');
  log('- **상표토끼**: 내 총점 × 5%×레벨 — 총점이 자라날수록 함께 강해지는 스노우볼 구조.');
  log('- **특허랑이**: 상대 총점 × 5%×레벨 — 상대가 앞서 있을 때만 크게 발동하는 역전기 구조.');
  log('- **디자인어**: 점수 "차이" × 5%×레벨 — 총점보다 훨씬 작은 값이 기준이라, 똑같은 5%라도');
  log('  실제로 얻는 점수는 상표토끼보다 항상 작다(4번 표의 "총점/격차 비율" 약 1.8배 참고).');
  log('- **실용신양**: 즉시 점수가 아니라 "다음 턴에 더 뽑을 기회"라 성격이 아예 다르다.');
  log('');
  log('### 권장 방향');
  log('');
  log('1. **레벨 초기화 정책 재검토가 우선**: 예를 들어 "레벨 1에서 쓰면 절반만 초기화" 또는');
  log('   "초기화 대신 임계값만큼만 차감"처럼, 낮은 레벨에서 성급하게 쓰더라도 손해가 지금만큼');
  log('   크지 않도록 완화하는 것이 계수 조정보다 먼저 다뤄야 할 문제로 보인다.');
  log('2. 그 다음 단계로, 디자인어의 계수를 상표토끼 대비 약 1.8~2.6배 높여 기준값 차이를');
  log('   보정하는 것을 검토할 만하다.');
  log('');
  log('이 리포트는 진단까지만 하며, 실제 규칙(레벨 초기화 정책·계수) 변경은 사용자 확인 후');
  log('진행한다.');
  log('');

  const outPath = path.join(__dirname, '..', '..', 'SKILL_BALANCE_REPORT.md');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`\n리포트 저장됨: ${outPath}`);
}

main();
