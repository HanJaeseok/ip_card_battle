import { EXPAND_TURN, MAX_TURN, ANIMALS } from 'shared';
import type { GameEvent, GameState, Team } from 'shared';
import { allCardsOpened, createBoard, createExpansionRing } from './board';
import { applyRabbitEffect } from './effects/rabbit';
import type { RNG } from './board';

function determineWinner(state: GameState): Team | 'draw' {
  const scoreOf = (team: Team) =>
    ANIMALS.reduce((sum, a) => sum + state.teams[team].scores[a], 0);
  const a = scoreOf('A');
  const b = scoreOf('B');
  if (a > b) return 'A';
  if (b > a) return 'B';
  return 'draw';
}

/**
 * 턴 종료 처리.
 * 호출 시점: 현재 activeTeam 플레이어가 카드를 오픈한 직후.
 *
 * 순서:
 * 1. 상표토끼 턴 종료 훅
 * 2. 팀 교대 (A→B, B→A)
 * 3. B→A 교대 시 턴 카운터 증가
 * 4. 20턴 도달 시 보드 확장 (1회)
 * 5. 40턴 초과 또는 전 카드 오픈 시 게임 종료
 */
export function advanceTurn(state: GameState, rng: RNG = Math.random): GameEvent[] {
  const events: GameEvent[] = [];

  // 상표토끼 턴 종료 훅
  events.push(...applyRabbitEffect(state));

  const currentTeam = state.activeTeam;
  const nextTeam: Team = currentTeam === 'A' ? 'B' : 'A';

  // B팀이 플레이를 마친 경우 → 턴 카운터 증가
  if (currentTeam === 'B') {
    state.turn++;

    // 20턴 종료 시점에 보드 확장
    if (state.turn === EXPAND_TURN + 1 && !state.expanded) {
      createExpansionRing(state.board, rng);
      state.expanded = true;
      events.push({ type: 'expand' });
    }

    // 종료 판정
    if (state.turn > MAX_TURN || allCardsOpened(state.board)) {
      state.phase = 'ended';
      state.winner = determineWinner(state);
      events.push({ type: 'gameEnd', winner: state.winner });
      return events;
    }
  }

  // 팀 교대 및 팀 내 플레이어 로테이션
  state.activeTeam = nextTeam;
  const teamSize = state.teams[nextTeam].members.length;
  if (teamSize > 1) {
    state.activePlayerIndex = (state.activePlayerIndex + 1) % teamSize;
  }

  return events;
}

/** 새 게임 상태 초기화 */
export function initGame(
  teamAMembers: string[],
  teamBMembers: string[],
  rng: RNG = Math.random,
): GameState {
  const makeTeam = (members: string[]) => ({
    members,
    scores: { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 },
    lastLevel: { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 },
  });

  return {
    phase: 'playing',
    turn: 1,
    activeTeam: 'A',
    activePlayerIndex: 0,
    board: createBoard(rng),
    expanded: false,
    teams: {
      A: makeTeam(teamAMembers),
      B: makeTeam(teamBMembers),
    },
    winner: null,
  };
}
