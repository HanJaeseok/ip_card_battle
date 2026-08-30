import { EXPAND_TURN, MAX_TURN, ANIMALS } from 'shared';
import type { GameEvent, GameState, Team } from 'shared';
import { initStacks } from './places';
import type { RNG } from './places';

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
 * 턴 종료 처리 — 스킬 선택까지 모두 끝난 뒤에만 호출된다.
 *
 * 순서:
 * 1. 팀 교대 (A→B, B→A)
 * 2. B→A 교대 시 턴 카운터 증가
 * 3. EXPAND_TURN 도달 시 "더 신나지는" 시점 진입 (1회) — 이때부터 폭탄 등장
 * 4. MAX_TURN 초과 시 게임 종료
 */
export function advanceTurn(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];

  const currentTeam = state.activeTeam;
  const nextTeam: Team = currentTeam === 'A' ? 'B' : 'A';

  // B팀이 플레이를 마친 경우 → 턴 카운터 증가
  if (currentTeam === 'B') {
    state.turn++;

    // EXPAND_TURN 종료 시점부터 폭탄이 등장한다
    if (state.turn === EXPAND_TURN + 1 && !state.expanded) {
      state.expanded = true;
      events.push({ type: 'expand' });
    }
  }

  // 종료 판정
  if (state.turn > MAX_TURN) {
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
    pendingExtraDraws: 0,
    playerIndex: 0,
    skillStats: {
      sheep: { count: 0, totalLevel: 0 },
      rabbit: { count: 0, totalLevel: 0 },
      mermaid: { count: 0, totalLevel: 0 },
      tiger: { count: 0, totalLevel: 0 },
    },
  });

  return {
    phase: 'playing',
    turn: 1,
    activeTeam: 'A',
    activePlayerIndex: 0,
    stacks: initStacks(),
    expanded: false,
    pendingChoice: null,
    teams: {
      A: makeTeam(teamAMembers),
      B: makeTeam(teamBMembers),
    },
    winner: null,
  };
}
