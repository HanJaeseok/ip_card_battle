import { THRESHOLDS } from 'shared';
import type { GameEvent, GameState } from 'shared';

/**
 * 상표토끼 효과 — 턴 종료 시 1회성 보너스 (turnManager에서 호출).
 * 발동 기준: 자기 팀 rabbit 점수가 10n 구간을 새로 넘을 때
 * 효과: gained × 현재턴수 점 보너스
 *
 * ⚠ 핵심: scores.rabbit에 보너스를 더한 후 lastLevel을 갱신한다.
 *    순서를 바꾸면 보너스로 추가된 점수가 다시 임계값을 넘어 재폭주한다.
 */
export function applyRabbitEffect(state: GameState): GameEvent[] {
  const team = state.activeTeam;
  const teamState = state.teams[team];
  const events: GameEvent[] = [];

  const newLevel = Math.floor(teamState.scores.rabbit / THRESHOLDS.rabbit);
  const gained = newLevel - teamState.lastLevel.rabbit;
  if (gained <= 0) return events;

  const bonus = gained * state.turn;
  teamState.scores.rabbit += bonus;
  teamState.lastLevel.rabbit = newLevel; // 보너스 반영 후 갱신 (재발동 방지)

  events.push({ type: 'rabbitBonus', team, bonus });
  return events;
}
