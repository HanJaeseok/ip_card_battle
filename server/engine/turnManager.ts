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
  }

  // 종료 판정 — 실용신양 상시효과로 한 팀의 턴 안에서 보드 전체가 소진될 수 있으므로,
  // 어느 팀이 방금 플레이했든 매번 확인한다 (B팀 턴 뒤로만 검사하면, A팀 턴 중 보드가
  // 모두 열려도 게임이 끝나지 않고 다음 팀에게 열 카드가 없는 채로 넘어가 멈춰버린다).
  if (state.turn > MAX_TURN || allCardsOpened(state.board)) {
    state.phase = 'ended';
    state.winner = determineWinner(state);
    events.push({ type: 'gameEnd', winner: state.winner });
    return events;
  }

  // 방금 플레이한 팀의 playerIndex를 다음 번을 위해 증가 (N:N 로테이션)
  const prevTeamState = state.teams[currentTeam];
  prevTeamState.playerIndex =
    (prevTeamState.playerIndex + 1) % prevTeamState.members.length;

  // 팀 교대 후 다음 팀의 현재 playerIndex를 activePlayerIndex에 반영
  state.activeTeam = nextTeam;
  state.activePlayerIndex = state.teams[nextTeam].playerIndex;

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
    playerIndex: 0,
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
