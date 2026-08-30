import type { WebSocket } from 'ws';
import type { Place, Team } from 'shared';
import type { ServerMessage } from 'shared';
import { processPlayerAction, processTimeout, initGame } from './engine/gameEngine';
import type { GameState } from 'shared';
import { TURN_TIME_SEC, PLACES } from 'shared';
import { serializeEvents, serializeState } from './serializer';

// 싱글 모드 컴퓨터 플레이어는 실제 WebSocket 연결이 없으므로 고정 ID로 취급한다.
const CPU_PLAYER_ID = 'CPU';
const CPU_NICKNAME = '컴퓨터';
const CPU_THINK_MIN_MS = 1500;
const CPU_THINK_MAX_MS = 2500;

interface PlayerConnection {
  ws: WebSocket;
  playerId: string;
  nickname: string;
  team: Team;
  ready: boolean;
  connected: boolean;
}

export class Room {
  private players = new Map<string, PlayerConnection>();  // playerId → PlayerConnection
  private teamPlayerIds: Record<Team, string[]> = { A: [], B: [] };
  private state: GameState | null = null;
  private turnDeadline = 0;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private vsComputer = false;
  private computerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly roomId: string,
    private onEmpty: () => void,
  ) {}

  // ─── 로비 ────────────────────────────────────────────────────────────────

  addPlayer(ws: WebSocket, playerId: string, nickname: string, team: Team): 'ok' | 'game_started' | 'nickname_taken' {
    if (this.state !== null) return 'game_started';

    for (const p of this.players.values()) {
      if (p.nickname === nickname) return 'nickname_taken';
    }

    this.players.set(playerId, { ws, playerId, nickname, team, ready: false, connected: true });
    this.teamPlayerIds[team].push(playerId);
    this.broadcastLobbyState();
    return 'ok';
  }

  /** 싱글 모드 — 사람은 A팀에 즉시 참가시키고, B팀은 컴퓨터(랜덤 클릭)로 채워 곧바로 게임을 시작한다. */
  addSoloPlayer(ws: WebSocket, playerId: string, nickname: string): void {
    this.vsComputer = true;
    this.players.set(playerId, { ws, playerId, nickname, team: 'A', ready: true, connected: true });
    this.teamPlayerIds.A.push(playerId);
    this.teamPlayerIds.B.push(CPU_PLAYER_ID);
    this.tryStartGame();
  }

  setReady(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    p.ready = true;
    this.broadcastLobbyState();
    this.tryStartGame();
  }

  private tryStartGame(): void {
    const all = [...this.players.values()];
    const minPlayers = this.vsComputer ? 1 : 2;
    if (all.length < minPlayers) return;
    if (!all.every(p => p.ready)) return;
    if (this.teamPlayerIds.A.length === 0 || this.teamPlayerIds.B.length === 0) return;

    const nickA = this.teamPlayerIds.A.map(id => this.players.get(id)?.nickname ?? CPU_NICKNAME);
    const nickB = this.teamPlayerIds.B.map(id => this.players.get(id)?.nickname ?? CPU_NICKNAME);
    this.state = initGame(nickA, nickB);

    this.resetTimer();
    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'gameStart', state: clientState });
    this.scheduleComputerMoveIfNeeded();
  }

  // ─── 게임 진행 ───────────────────────────────────────────────────────────

  handleDrawCard(playerId: string, place: Place): void {
    if (!this.state || this.state.phase !== 'playing') {
      this.sendTo(playerId, { type: 'error', code: 'GAME_NOT_STARTED', message: '게임이 시작되지 않았습니다.' });
      return;
    }

    const expectedId = this.teamPlayerIds[this.state.activeTeam][this.state.activePlayerIndex];
    if (playerId !== expectedId) {
      this.sendTo(playerId, { type: 'error', code: 'NOT_YOUR_TURN', message: '지금은 당신의 차례가 아닙니다.' });
      return;
    }

    const { state, events } = processPlayerAction(this.state, place);
    this.state = state;
    this.resetTimer();

    const clientEvents = serializeEvents(events);
    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });

    if (this.state.phase === 'ended') this.clearTimer();
    else this.scheduleComputerMoveIfNeeded();
  }

  /** 싱글 모드 — 컴퓨터(B팀) 차례가 되면 잠시 "생각하는" 척한 뒤 무작위 장소를 클릭한다. */
  private scheduleComputerMoveIfNeeded(): void {
    if (!this.vsComputer || !this.state || this.state.phase !== 'playing') return;
    if (this.state.activeTeam !== 'B') return;
    if (this.computerTimer !== null) return;

    const delay = CPU_THINK_MIN_MS + Math.floor(Math.random() * (CPU_THINK_MAX_MS - CPU_THINK_MIN_MS));
    this.computerTimer = setTimeout(() => {
      this.computerTimer = null;
      this.performComputerMove();
    }, delay);
  }

  private performComputerMove(): void {
    if (!this.state || this.state.phase !== 'playing' || this.state.activeTeam !== 'B') return;

    const place = PLACES[Math.floor(Math.random() * PLACES.length)];
    const { state, events } = processPlayerAction(this.state, place);
    this.state = state;
    this.resetTimer();

    const clientEvents = serializeEvents(events);
    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });

    if (this.state.phase === 'ended') this.clearTimer();
    else this.scheduleComputerMoveIfNeeded();
  }

  handleTimeout(): void {
    if (!this.state || this.state.phase !== 'playing') return;

    const { state, events } = processTimeout(this.state);
    this.state = state;

    const firstEv = events.find(e => e.type === 'draw' || e.type === 'bomb');
    const timeoutPlace =
      firstEv?.type === 'draw' || firstEv?.type === 'bomb' ? firstEv.place : null;

    const clientEvents = serializeEvents(events);
    if (timeoutPlace) {
      clientEvents.unshift({ type: 'timeout', place: timeoutPlace });
    }

    if (this.state.phase === 'playing') {
      this.resetTimer();
    } else {
      this.clearTimer();
    }

    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });

    if (this.state.phase === 'playing') this.scheduleComputerMoveIfNeeded();
  }

  // ─── 타이머 ──────────────────────────────────────────────────────────────

  private resetTimer(): void {
    this.clearTimer();
    this.turnDeadline = Date.now() + TURN_TIME_SEC * 1000;
    this.timerHandle = setTimeout(() => this.handleTimeout(), TURN_TIME_SEC * 1000);
  }

  private clearTimer(): void {
    if (this.timerHandle !== null) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    if (this.computerTimer !== null) {
      clearTimeout(this.computerTimer);
      this.computerTimer = null;
    }
  }

  // ─── 재접속/이탈 ─────────────────────────────────────────────────────────

  handleDisconnect(playerId: string, ws: WebSocket): void {
    const p = this.players.get(playerId);
    if (!p) return;
    // 재접속으로 이미 새 WS로 교체된 경우 구 WS의 close 이벤트는 무시
    if (p.ws !== ws) return;
    p.connected = false;

    if (this.state === null) {
      // 로비에서 나가면 플레이어 제거
      this.players.delete(playerId);
      const idx = this.teamPlayerIds[p.team].indexOf(playerId);
      if (idx !== -1) this.teamPlayerIds[p.team].splice(idx, 1);
      this.broadcastLobbyState();

      if (this.players.size === 0) this.onEmpty();
    }
    // 게임 중 이탈: 차례가 오면 타이머 만료로 자동 강제진행
  }

  handleReconnect(ws: WebSocket, playerId: string): boolean {
    const p = this.players.get(playerId);
    if (!p) return false;

    p.ws = ws;
    p.connected = true;

    if (this.state === null) {
      this.sendTo(playerId, { type: 'lobbyState', players: this.buildLobbyPlayers() });
    } else {
      const clientState = serializeState(this.state, this.turnDeadline);
      this.sendTo(playerId, { type: 'gameSnapshot', state: clientState });
    }
    return true;
  }

  // ─── 브로드캐스트 ────────────────────────────────────────────────────────

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) {
      if (p.connected && p.ws.readyState === 1 /* OPEN */) {
        p.ws.send(data);
      }
    }
  }

  sendTo(playerId: string, msg: ServerMessage): void {
    const p = this.players.get(playerId);
    if (p?.ws.readyState === 1) {
      p.ws.send(JSON.stringify(msg));
    }
  }

  private broadcastLobbyState(): void {
    this.broadcast({ type: 'lobbyState', players: this.buildLobbyPlayers() });
  }

  private buildLobbyPlayers() {
    return [...this.players.values()].map(p => ({
      nickname: p.nickname,
      team: p.team,
      ready: p.ready,
    }));
  }
}
