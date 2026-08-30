import type { GameEvent, GameState } from 'shared';
import type { ClientGameEvent, ClientGameState } from 'shared';

/**
 * 서버 GameState → 클라이언트 전송용 ClientGameState 변환.
 * 카드는 뽑히는 즉시 공개되므로 숨길 정보가 없어, 활성 플레이어 닉네임과
 * 턴 데드라인만 덧붙이면 된다.
 */
export function serializeState(
  state: GameState,
  turnDeadline: number,
): ClientGameState {
  const activeTeam = state.teams[state.activeTeam];
  const activePlayerNickname = activeTeam.members[state.activePlayerIndex] ?? '';

  return {
    phase: state.phase,
    turn: state.turn,
    activeTeam: state.activeTeam,
    activePlayerIndex: state.activePlayerIndex,
    activePlayerNickname,
    turnDeadline,
    stacks: {
      sheep: [...state.stacks.sheep],
      rabbit: [...state.stacks.rabbit],
      mermaid: [...state.stacks.mermaid],
      tiger: [...state.stacks.tiger],
    },
    expanded: state.expanded,
    pendingChoice: state.pendingChoice,
    teams: {
      A: {
        members: state.teams.A.members,
        scores: { ...state.teams.A.scores },
        pendingExtraDraws: state.teams.A.pendingExtraDraws,
        playerIndex: state.teams.A.playerIndex,
      },
      B: {
        members: state.teams.B.members,
        scores: { ...state.teams.B.scores },
        pendingExtraDraws: state.teams.B.pendingExtraDraws,
        playerIndex: state.teams.B.playerIndex,
      },
    },
    winner: state.winner,
  };
}

/** GameEvent와 ClientGameEvent는 동일한 형태라 그대로 통과시킨다. */
export function serializeEvents(events: GameEvent[]): ClientGameEvent[] {
  return events;
}
