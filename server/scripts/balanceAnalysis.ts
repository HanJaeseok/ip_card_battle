/**
 * 스킬 밸런스 분석 스크립트 — 4가지 스킬(실용신양·상표토끼·디자인어·특허랑이)이
 * 전부 동일하게 "레벨 × 5%"라는 계수를 쓰고 있는데, 임계값(10/10/20/20)과 계산
 * 기준(내 총점/상대 총점/점수 차)이 서로 달라 실제 체감 가치도 똑같을지는
 * 확인이 필요하다. 이 스크립트는 많은 게임을 시뮬레이션하며, 봇이 스킬을 고를
 * 때마다 "지금 고를 수 있는 스킬들의 즉시 가치"를 직접 계산해 가장 높은 것을
 * 고르는 탐욕적(greedy) 전략을 쓰게 하고, 각 동물이 실제로 얼마나 자주/얼마나
 * 크게 기여했는지를 집계한다.
 *
 * 실행: cd server && npx ts-node scripts/balanceAnalysis.ts [게임수]
 */
import { initGame } from '../engine/turnManager';
import { processPlayerAction, processSkillChoice, processPass } from '../engine/gameEngine';
import { eligibleAnimals, levelOf, totalScore } from '../engine/skills';
import { PLACES } from 'shared';
import type { Animal, GameState, Team } from 'shared';
import { ANIMALS, SKILL_COEFFICIENTS } from 'shared';

function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// 실용신양의 "추가로 N장 더 뽑는다"는 직접적인 점수가 아니라서, 카드 숫자 범위의
// 평균값(1~5, 5~9 두 범위 모두 대략 평균 5)으로 대략적인 기대 점수 가치로 환산한다.
// (뽑은 카드가 짝을 이뤄야 실제 점수가 되므로 다소 과대평가일 수 있음 — 상대적
// 비교용 근사치임을 감안해서 볼 것)
const AVG_CARD_VALUE = 5;

function skillValue(state: GameState, team: Team, animal: Animal): number {
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const level = levelOf(state, team, animal);
  if (animal === 'sheep') return level * AVG_CARD_VALUE;
  const coef = SKILL_COEFFICIENTS[animal];
  if (animal === 'rabbit') return Math.round(totalScore(state, team) * coef * level);
  if (animal === 'mermaid') return Math.round(Math.abs(totalScore(state, team) - totalScore(state, opponent)) * coef * level);
  return Math.round(totalScore(state, opponent) * coef * level); // tiger
}

/** 지금 이 팀이 고를 수 있는 스킬들의 "즉시 가치"를 계산해 가장 높은 것을 고르는 탐욕적 선택. */
function greedyPick(state: GameState, team: Team): Animal | null {
  const options = eligibleAnimals(state, team);
  if (options.length === 0) return null;

  let best: Animal = options[0];
  let bestValue = -Infinity;
  for (const animal of options) {
    const value = skillValue(state, team, animal);
    if (value > bestValue) {
      bestValue = value;
      best = animal;
    }
  }
  return best;
}

// "인내심 있는" 전략 — 레벨이 PATIENCE_LEVEL 이상으로 쌓인 스킬만 고르고,
// 그렇지 않으면 패스하며 레벨을 더 모은다(다음을 노리기).
const PATIENCE_LEVEL = 3;
function patientPick(state: GameState, team: Team): Animal | null {
  const options = eligibleAnimals(state, team).filter(a => levelOf(state, team, a) >= PATIENCE_LEVEL);
  if (options.length === 0) return null;

  let best: Animal = options[0];
  let bestValue = -Infinity;
  for (const animal of options) {
    const value = skillValue(state, team, animal);
    if (value > bestValue) {
      bestValue = value;
      best = animal;
    }
  }
  return best;
}

interface AnimalStat {
  picks: number;
  totalLevel: number;
  totalValue: number; // myScoreDelta + oppScoreDelta (실용신양은 근사 가치)
}

function emptyStat(): AnimalStat {
  return { picks: 0, totalLevel: 0, totalValue: 0 };
}

type PickFn = (state: GameState, team: Team) => Animal | null;

function runGame(
  seed: number,
  pick: PickFn,
  stats: Record<Animal, AnimalStat>,
  winnerAnimalValue: Record<Animal, number>,
  loserAnimalValue: Record<Animal, number>,
  baseStatsSampler?: (total: number, gap: number) => void,
) {
  const rng = makeLCG(seed);
  const state = initGame(['botA'], ['botB'], rng);

  // 이번 게임에서 각 팀이 각 동물로 벌어들인 가치(승/패 상관관계 분석용)
  const perTeamAnimalValue: Record<Team, Record<Animal, number>> = {
    A: { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 },
    B: { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 },
  };

  let safety = 0;
  while (state.phase === 'playing') {
    if (safety++ > 200_000) throw new Error(`무한루프 감지 seed=${seed}`);

    const place = PLACES[Math.floor(rng() * PLACES.length)];
    processPlayerAction(state, place, rng);

    if (state.pendingChoice !== null) {
      const team = state.pendingChoice;
      const opponent: Team = team === 'A' ? 'B' : 'A';
      baseStatsSampler?.(totalScore(state, team), Math.abs(totalScore(state, team) - totalScore(state, opponent)));
      const animal = pick(state, team);
      if (animal === null) {
        processPass(state);
      } else {
        const level = levelOf(state, team, animal);
        const { events } = processSkillChoice(state, animal);
        const ev = events.find(e => e.type === 'skillApplied');
        let value = 0;
        if (ev && ev.type === 'skillApplied') {
          value = animal === 'sheep' ? level * AVG_CARD_VALUE : ev.myScoreDelta + ev.oppScoreDelta;
        }
        stats[animal].picks += 1;
        stats[animal].totalLevel += level;
        stats[animal].totalValue += value;
        perTeamAnimalValue[team][animal] += value;
      }
    }
  }

  const scoreOf = (t: Team) => ANIMALS.reduce((s, a) => s + state.teams[t].scores[a], 0);
  const aScore = scoreOf('A');
  const bScore = scoreOf('B');
  const winner: Team | 'draw' = aScore > bScore ? 'A' : bScore > aScore ? 'B' : 'draw';

  if (winner !== 'draw') {
    const loser: Team = winner === 'A' ? 'B' : 'A';
    for (const a of ANIMALS) {
      winnerAnimalValue[a] += perTeamAnimalValue[winner][a];
      loserAnimalValue[a] += perTeamAnimalValue[loser][a];
    }
  }

  return { winner, aScore, bScore };
}

function runBatch(label: string, pick: PickFn, gameCount: number) {
  const stats: Record<Animal, AnimalStat> = {
    sheep: emptyStat(), rabbit: emptyStat(), mermaid: emptyStat(), tiger: emptyStat(),
  };
  const winnerAnimalValue: Record<Animal, number> = { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 };
  const loserAnimalValue: Record<Animal, number> = { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 };

  let aWins = 0, bWins = 0, draws = 0;
  let totalAScore = 0, totalBScore = 0;
  let sumTotal = 0, sumGap = 0, sampleCount = 0;
  const sampler = (total: number, gap: number) => { sumTotal += total; sumGap += gap; sampleCount++; };

  for (let seed = 1; seed <= gameCount; seed++) {
    const { winner, aScore, bScore } = runGame(seed, pick, stats, winnerAnimalValue, loserAnimalValue, sampler);
    if (winner === 'A') aWins++;
    else if (winner === 'B') bWins++;
    else draws++;
    totalAScore += aScore;
    totalBScore += bScore;
  }

  console.log(`\n=== ${label} (${gameCount}게임, 계수: 양/토끼/호랑이 ${SKILL_COEFFICIENTS.rabbit * 100}%, 인어 ${SKILL_COEFFICIENTS.mermaid * 100}%) ===\n`);
  console.log(`A팀 승 ${aWins} (${(100 * aWins / gameCount).toFixed(1)}%) / B팀 승 ${bWins} (${(100 * bWins / gameCount).toFixed(1)}%) / 무승부 ${draws}`);
  console.log(`평균 최종 점수(팀 합계) — A: ${(totalAScore / gameCount).toFixed(1)}, B: ${(totalBScore / gameCount).toFixed(1)}\n`);

  const totalValueAll = ANIMALS.reduce((s, a) => s + stats[a].totalValue, 0);
  const totalPicksAll = ANIMALS.reduce((s, a) => s + stats[a].picks, 0);

  console.log('동물별 선택 횟수 / 평균 레벨(고를 때) / 총 기여 가치(근사) / 가치 비중 / 1회당 평균 가치');
  for (const a of ANIMALS) {
    const s = stats[a];
    const avgLevel = s.picks > 0 ? s.totalLevel / s.picks : 0;
    const valueShare = totalValueAll > 0 ? (100 * s.totalValue / totalValueAll) : 0;
    const pickShare = totalPicksAll > 0 ? (100 * s.picks / totalPicksAll) : 0;
    const avgValuePerPick = s.picks > 0 ? s.totalValue / s.picks : 0;
    console.log(
      `  ${a.padEnd(8)} picks=${String(s.picks).padStart(6)} (${pickShare.toFixed(1)}%)  ` +
      `avgLv=${avgLevel.toFixed(2)}  totalValue=${Math.round(s.totalValue).toString().padStart(9)} (${valueShare.toFixed(1)}%)  ` +
      `avgValue/pick=${avgValuePerPick.toFixed(1)}`
    );
  }

  console.log('\n승리팀 vs 패배팀의 동물별 평균 기여 가치 (승리팀이 유의미하게 높으면 그 스킬이 승패에 강하게 기여한다는 뜻)');
  for (const a of ANIMALS) {
    const w = winnerAnimalValue[a] / gameCount;
    const l = loserAnimalValue[a] / gameCount;
    const ratio = l > 0 ? (w / l).toFixed(2) : (w > 0 ? '∞' : '-');
    console.log(`  ${a.padEnd(8)} 승리팀 평균=${w.toFixed(1)}  패배팀 평균=${l.toFixed(1)}  비율(승/패)=${ratio}`);
  }

  if (sampleCount > 0) {
    const avgTotal = sumTotal / sampleCount;
    const avgGap = sumGap / sampleCount;
    const ratio = avgGap > 0 ? avgTotal / avgGap : Infinity;
    console.log(`\n스킬 선택 시점 평균 "내 총점"=${avgTotal.toFixed(1)}  평균 "점수 격차"=${avgGap.toFixed(1)}  (총점/격차 비율=${ratio.toFixed(1)}배)`);
    console.log(`  → 디자인어(격차 기반)가 상표토끼(총점 기반)와 같은 체감 가치를 내려면, 계수를 약 ${ratio.toFixed(1)}배 높여야 함`);
  }
  console.log('');
}

function main() {
  const gameCount = Number(process.argv[2] ?? 3000);
  runBatch('탐욕적 봇(레벨 1이라도 즉시 최고가치 스킬 선택)', greedyPick, gameCount);
  runBatch(`인내심 있는 봇(레벨 ${PATIENCE_LEVEL} 이상 쌓일 때까지 패스 후 최고가치 스킬 선택)`, patientPick, gameCount);
}

main();
