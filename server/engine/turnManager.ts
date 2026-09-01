import { MAX_TURN, LOSE_HP, clampSettings } from 'shared';
import type { GameEvent, GameSettings, GameState, Team } from 'shared';
import { initStacks } from './places';
import type { RNG } from './places';

/**
 * 시작 체력 = 목표 점수 그 자체다 — 목표 점수만큼 "더 벌거나 잃어야" 끝나는 게임이므로,
 * 목표 점수가 6이면 6에서 시작해 12에 닿으면 승리, 0에 닿으면 패배다.
 */
function winHpOf(state: GameState): number {
  return state.settings.targetScore * 2;
}

function determineWinnerByHp(state: GameState): Team | 'draw' {
  const a = state.teams.A.hp;
  const b = state.teams.B.hp;
  if (a > b) return 'A';
  if (b > a) return 'B';
  return 'draw';
}

/** 게임 종료를 한 곳에서 처리한다 — phase/winner/pendingChoice를 모두 정리하고 gameEnd를 낸다. */
function endGame(state: GameState, winner: Team | 'draw', reason: 'knockout' | 'turnLimit'): GameEvent[] {
  state.phase = 'ended';
  state.winner = winner;
  state.pendingChoice = null;
  return [{ type: 'gameEnd', winner, reason }];
}

/**
 * 체력 즉시 승패 판정 — 행동을 적용한 직후(=턴을 넘기기 전)에 호출된다.
 * 체력은 오직 상표토끼(자신)·특허랑이(상대에게서 강탈)로만 움직이므로, 이론상 두 팀이
 * 동시에 승리 조건을 만족할 수 없다. 그래도 방어적으로 무승부 분기를 남겨둔다.
 */
export function checkKnockout(state: GameState): GameEvent[] {
  if (state.phase !== 'playing') return [];

  const winHp = winHpOf(state);
  const aWins = state.teams.A.hp >= winHp || state.teams.B.hp <= LOSE_HP;
  const bWins = state.teams.B.hp >= winHp || state.teams.A.hp <= LOSE_HP;
  if (!aWins && !bWins) return [];
  if (aWins && bWins) return endGame(state, 'draw', 'knockout');
  return endGame(state, aWins ? 'A' : 'B', 'knockout');
}

/**
 * 턴 종료 공통 경로 — 행동 선택(또는 패스) 직후 반드시 이걸 거친다.
 * 즉시 승패가 났으면 턴을 넘기지 않고 그대로 게임을 끝낸다.
 */
export function finishTurn(state: GameState): GameEvent[] {
  const ko = checkKnockout(state);
  if (ko.length > 0) return ko;
  return advanceTurn(state);
}

/**
 * 턴 종료 처리 — 행동 선택까지 모두 끝난 뒤에만(또는 checkKnockout이 통과한 뒤에만) 호출된다.
 *
 * 순서:
 * 1. 이미 끝난 게임은 절대 되살리지 않는다.
 * 2. 팀 교대 (A→B, B→A)
 * 3. B→A 교대 시 턴 카운터 증가
 * 4. FESTIVAL_TURN 도달 시 축제 진입 (1회) — 이때부터 페어 경험치 2배
 * 5. MAX_TURN 초과 시 체력 비교로 게임 종료
 */
export function advanceTurn(state: GameState): GameEvent[] {
  if (state.phase !== 'playing') return [];

  const events: GameEvent[] = [];

  const currentTeam = state.activeTeam;
  const nextTeam: Team = currentTeam === 'A' ? 'B' : 'A';

  // B팀이 플레이를 마친 경우 → 턴 카운터 증가
  if (currentTeam === 'B') {
    state.turn++;

    // settings.festivalTurn 도달 시점부터 축제가 시작된다
    if (!state.festival && state.turn >= state.settings.festivalTurn) {
      state.festival = true;
      events.push({ type: 'festival' });
    }
  }

  // 종료 판정 — 턴 상한 초과 시 체력 비교
  if (state.turn > MAX_TURN) {
    return [...events, ...endGame(state, determineWinnerByHp(state), 'turnLimit')];
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

/** 새 게임 상태 초기화 — settings를 생략하면 기본 규칙(shared/constants.ts DEFAULT_*)으로 시작한다. */
export function initGame(
  teamAMembers: string[],
  teamBMembers: string[],
  rng: RNG = Math.random,
  settings?: Partial<GameSettings>,
): GameState {
  const resolvedSettings = clampSettings(settings);

  const makeTeam = (members: string[]) => ({
    members,
    exp: { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 },
    hp: resolvedSettings.targetScore,
    pendingMultiplier: 1,
    pendingExtraDraws: 0,
    playerIndex: 0,
    skillStats: {
      sheep: { count: 0, totalLevel: 0, totalHpGained: 0, totalExtraDraws: 0 },
      rabbit: { count: 0, totalLevel: 0, totalHpGained: 0, totalExtraDraws: 0 },
      mermaid: { count: 0, totalLevel: 0, totalHpGained: 0, totalExtraDraws: 0 },
      tiger: { count: 0, totalLevel: 0, totalHpGained: 0, totalExtraDraws: 0 },
    },
  });

  return {
    phase: 'playing',
    turn: 1,
    activeTeam: 'A',
    activePlayerIndex: 0,
    stacks: initStacks(),
    festival: false,
    pendingChoice: null,
    teams: {
      A: makeTeam(teamAMembers),
      B: makeTeam(teamBMembers),
    },
    winner: null,
    settings: resolvedSettings,
  };
}
