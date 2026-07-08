import { THRESHOLDS, TIGER_COEF } from 'shared';
import type { GameEvent, GameState, Team } from 'shared';

/**
 * 특허랑이 효과 — 상대 실용신양·상표토끼 점수 감소.
 * 발동 기준: 자기 팀 tiger 점수가 20n 구간을 새로 넘을 때
 * 효과: 상대 sheep·rabbit 각각 round(gained × turn × 1.5) 감소 (최소 0)
 */
export function applyTigerEffect(state: GameState): GameEvent[] {
  const team = state.activeTeam;
  const opponent: Team = team === 'A' ? 'B' : 'A';
  const teamState = state.teams[team];
  const opState = state.teams[opponent];
  const events: GameEvent[] = [];

  const newLevel = Math.floor(teamState.scores.tiger / THRESHOLDS.tiger);
  const gained = newLevel - teamState.lastLevel.tiger;
  if (gained <= 0) return events;

  teamState.lastLevel.tiger = newLevel;

  const dmg = Math.round(gained * state.turn * TIGER_COEF);
  opState.scores.sheep = Math.max(0, opState.scores.sheep - dmg);
  opState.scores.rabbit = Math.max(0, opState.scores.rabbit - dmg);

  // 점수가 깎였으니 lastLevel도 현재 점수 수준으로 함께 낮춘다.
  // 그래야 나중에 이 임계값을 다시 넘었을 때 상표토끼 보너스가 재발동한다
  // (lastLevel이 하락 없이 계속 높게 남아 있으면 재도달을 감지 못하는 버그가 있었음).
  opState.lastLevel.sheep = Math.min(
    opState.lastLevel.sheep,
    Math.floor(opState.scores.sheep / THRESHOLDS.sheep),
  );
  opState.lastLevel.rabbit = Math.min(
    opState.lastLevel.rabbit,
    Math.floor(opState.scores.rabbit / THRESHOLDS.rabbit),
  );

  events.push({ type: 'tigerAttack', team, dmg });
  return events;
}
