import { THRESHOLDS, MERMAID_CATCHUP_PCT, MERMAID_LEAD_BONUS_COEF, ANIMALS } from 'shared';
import type { Animal, GameEvent, GameState, Team } from 'shared';

function totalScore(state: GameState, team: Team): number {
  return ANIMALS.reduce((sum, a) => sum + state.teams[team].scores[a], 0);
}

/**
 * 상대 팀 점수를 각 animal 비율로 absorb만큼 차감.
 * 비율 차감으로 개별 점수가 음수가 되지 않음을 보장한다.
 */
function distributeDeduct(
  state: GameState,
  opponent: Team,
  absorb: number,
): void {
  const opScores = state.teams[opponent].scores;
  const opTotal = totalScore(state, opponent);
  if (opTotal === 0) return;

  let remaining = absorb;
  const animals = [...ANIMALS] as Animal[];

  // 마지막 animal에 나머지를 몰아 반올림 오차를 제거한다
  for (let i = 0; i < animals.length - 1; i++) {
    const animal = animals[i];
    const cut = Math.round((opScores[animal] / opTotal) * absorb);
    const actual = Math.min(cut, opScores[animal], remaining);
    opScores[animal] -= actual;
    remaining -= actual;
  }
  const last = animals[animals.length - 1];
  opScores[last] = Math.max(0, opScores[last] - remaining);
}

/**
 * 디자인어 효과 — 캐치업 또는 리드 보너스.
 * 발동 기준: 자기 팀 mermaid 점수가 20n 구간을 새로 넘을 때
 * 효과:
 *   - 뒤처진 경우: 격차의 50%를 상대로부터 흡수 (상대 점수 감소 + 내 mermaid 증가)
 *   - 앞선/동점 경우: round(gained × turn × 0.3) 소량 보너스
 */
export function applyMermaidEffect(state: GameState): GameEvent[] {
  const team = state.activeTeam;
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const teamState = state.teams[team];
  const events: GameEvent[] = [];

  const newLevel = Math.floor(teamState.scores.mermaid / THRESHOLDS.mermaid);
  const gained = newLevel - teamState.lastLevel.mermaid;
  if (gained <= 0) return events;

  teamState.lastLevel.mermaid = newLevel;

  const myTotal = totalScore(state, team);
  const opTotal = totalScore(state, opponent);

  if (myTotal < opTotal) {
    const gap = opTotal - myTotal;
    const absorb = Math.min(Math.round(gap * MERMAID_CATCHUP_PCT), opTotal);
    distributeDeduct(state, opponent, absorb);
    teamState.scores.mermaid += absorb;
    events.push({ type: 'mermaidCatchup', team, absorb });
  } else {
    const bonus = Math.round(gained * state.turn * MERMAID_LEAD_BONUS_COEF);
    teamState.scores.mermaid += bonus;
    events.push({ type: 'mermaidBonus', team, bonus });
  }

  return events;
}
