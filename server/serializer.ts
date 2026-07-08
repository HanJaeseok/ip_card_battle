import type { GameEvent, GameState } from 'shared';
import type {
  ClientBoardEntry,
  ClientGameEvent,
  ClientGameState,
  ClientTeamState,
} from 'shared';

/**
 * 서버 GameState → 클라이언트 전송용 ClientGameState 변환.
 * 미오픈(open:false) 카드의 animal/num은 절대 포함하지 않는다.
 */
export function serializeState(
  state: GameState,
  turnDeadline: number,
): ClientGameState {
  const board: ClientBoardEntry[] = [];
  for (const [key, card] of state.board) {
    if (card.open) {
      board.push({
        key,
        card: {
          open: true,
          animal: card.animal,
          num: card.num,
          collectedBy: card.collectedBy,
          openedBy: card.openedBy,
        },
      });
    } else {
      board.push({ key, card: { open: false, collectedBy: card.collectedBy } });
    }
  }

  const teams: Record<'A' | 'B', ClientTeamState> = {
    A: {
      members: state.teams.A.members,
      scores: { ...state.teams.A.scores },
      lastLevel: { ...state.teams.A.lastLevel },
    },
    B: {
      members: state.teams.B.members,
      scores: { ...state.teams.B.scores },
      lastLevel: { ...state.teams.B.lastLevel },
    },
  };

  const activeTeam = state.teams[state.activeTeam];
  const activePlayerNickname = activeTeam.members[state.activePlayerIndex] ?? '';

  return {
    phase: state.phase,
    turn: state.turn,
    activeTeam: state.activeTeam,
    activePlayerIndex: state.activePlayerIndex,
    activePlayerNickname,
    turnDeadline,
    board,
    expanded: state.expanded,
    teams,
    winner: state.winner,
  };
}

/**
 * 서버 GameEvent[] → ClientGameEvent[] 변환.
 * 'open' 이벤트의 card 타입을 ClientCard(open:true) 형태로 명시 변환.
 */
export function serializeEvents(events: GameEvent[]): ClientGameEvent[] {
  return events.map((e): ClientGameEvent => {
    if (e.type === 'open') {
      return {
        type: 'open',
        key: e.key,
        card: {
          open: true,
          animal: e.card.animal,
          num: e.card.num,
          collectedBy: e.card.collectedBy,
          openedBy: e.card.openedBy,
        },
      };
    }
    return e as ClientGameEvent;
  });
}
