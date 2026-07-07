import type { Animal, CardNum, GamePhase, Team } from './types';

// ─── 클라이언트 → 서버 ───────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'createRoom'; nickname: string; team: Team }
  | { type: 'joinRoom'; roomId: string; nickname: string; team: Team }
  | { type: 'ready' }
  | { type: 'openCard'; r: number; c: number }
  | { type: 'reconnect'; roomId: string; playerId: string };

// ─── 서버 → 클라이언트 ──────────────────────────────────────────────────────

export type ServerMessage =
  // 로비
  | { type: 'roomCreated'; roomId: string; playerId: string }
  | { type: 'roomJoined'; roomId: string; playerId: string }
  | { type: 'lobbyState'; players: LobbyPlayer[] }
  | { type: 'error'; code: ErrorCode; message: string }
  // 게임
  | { type: 'gameStart'; state: ClientGameState }
  | { type: 'gameSnapshot'; state: ClientGameState }   // 재접속용
  | { type: 'actionResult'; events: ClientGameEvent[]; state: ClientGameState };

export interface LobbyPlayer {
  nickname: string;
  team: Team;
  ready: boolean;
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NICKNAME_TAKEN'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_AVAILABLE'
  | 'GAME_NOT_STARTED'
  | 'GAME_ALREADY_STARTED'
  | 'INVALID_RECONNECT';

// ─── 클라이언트 게임 상태 (치팅 방지: 미오픈 카드 animal/num 제거) ────────────

export type ClientCard =
  | { open: true; animal: Animal; num: CardNum; collectedBy: Team | null }
  | { open: false; collectedBy: Team | null };

export interface ClientBoardEntry {
  key: string;  // "r,c"
  card: ClientCard;
}

export interface ClientTeamState {
  members: string[];
  scores: Record<Animal, number>;
}

export interface ClientGameState {
  phase: GamePhase;
  turn: number;
  activeTeam: Team;
  activePlayerIndex: number;
  activePlayerNickname: string;
  turnDeadline: number;           // Date.now() + 30000 (클라이언트 타이머용)
  board: ClientBoardEntry[];      // Map → Array (JSON 직렬화)
  expanded: boolean;
  teams: Record<Team, ClientTeamState>;
  winner: Team | 'draw' | null;
}

// ─── 클라이언트 게임 이벤트 (open 이벤트는 open:true 카드만) ─────────────────

export type ClientGameEvent =
  | { type: 'open'; key: string; card: Extract<ClientCard, { open: true }> }
  | { type: 'collect'; animal: Animal; team: Team; score: number; keys: string[] }
  | { type: 'sheepChain'; count: number; level: number }
  | { type: 'tigerAttack'; team: Team; dmg: number }
  | { type: 'rabbitBonus'; team: Team; bonus: number }
  | { type: 'mermaidCatchup'; team: Team; absorb: number }
  | { type: 'mermaidBonus'; team: Team; bonus: number }
  | { type: 'expand' }
  | { type: 'gameEnd'; winner: Team | 'draw' }
  | { type: 'timeout'; key: string };
