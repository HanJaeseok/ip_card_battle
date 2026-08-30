import type { Animal, GameEvent, GameState, Place, Team } from './types';

// ─── 클라이언트 → 서버 ───────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'createRoom'; nickname: string; team: Team; teamName?: string }
  | { type: 'joinRoom'; roomId: string; nickname: string; team: Team; teamName?: string }
  | { type: 'createSoloRoom'; nickname: string; teamName?: string } // 싱글 모드 — 컴퓨터(랜덤 클릭)와 즉시 대전
  | { type: 'ready' }
  | { type: 'drawCard'; place: Place }
  | { type: 'chooseSkill'; animal: Animal } // 턴 종료 시 4가지 스킬 중 하나 선택
  | { type: 'passSkill' } // 턴 종료 시 "아무것도 하지 않음" 선택
  | { type: 'reconnect'; roomId: string; playerId: string };

// ─── 서버 → 클라이언트 ──────────────────────────────────────────────────────

export type ServerMessage =
  // 로비
  | { type: 'roomCreated'; roomId: string; playerId: string }
  | { type: 'roomJoined'; roomId: string; playerId: string }
  | { type: 'lobbyState'; players: LobbyPlayer[]; teamNames: Record<Team, string | null> }
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
  | 'INVALID_RECONNECT'
  | 'NO_PENDING_CHOICE';

// ─── 클라이언트 게임 상태 ─────────────────────────────────────────────────────
// 카드가 뽑히는 즉시 공개되므로(숨겨진 카드 상태가 없음) 서버 GameState를 그대로
// 확장해서 쓴다 — 예전처럼 별도의 클라이언트 전용 board 직렬화가 필요 없다.

export interface ClientGameState extends GameState {
  activePlayerNickname: string;
  turnDeadline: number; // Date.now() + (30 + 10×예약된 추가뽑기)초 (클라이언트 타이머 표시용)
  teamNames: Record<Team, string>; // 방장이 정했거나 무작위로 배정된 팀 이름("A팀"/"B팀" 대신 표시)
}

export type ClientGameEvent = GameEvent;
