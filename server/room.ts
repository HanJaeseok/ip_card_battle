import type { WebSocket } from 'ws';
import type { Team } from 'shared';
import type { ClientMessage, ServerMessage } from 'shared';
import { processPlayerAction, processTimeout, initGame } from './engine/gameEngine';
import type { GameState } from 'shared';
import { TURN_TIME_SEC } from 'shared';
import { serializeEvents, serializeState } from './serializer';

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

  setReady(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    p.ready = true;
    this.broadcastLobbyState();
    this.tryStartGame();
  }

  private tryStartGame(): void {
    const all = [...this.players.values()];
    if (all.length < 2) return;
    if (!all.every(p => p.ready)) return;
    if (this.teamPlayerIds.A.length === 0 || this.teamPlayerIds.B.length === 0) return;

    const nickA = this.teamPlayerIds.A.map(id => this.players.get(id)!.nickname);
    const nickB = this.teamPlayerIds.B.map(id => this.players.get(id)!.nickname);
    this.state = initGame(nickA, nickB);

    this.resetTimer();
    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'gameStart', state: clientState });
  }

  // ─── 게임 진행 ───────────────────────────────────────────────────────────

  handleOpenCard(playerId: string, r: number, c: number): void {
    if (!this.state || this.state.phase !== 'playing') {
      this.sendTo(playerId, { type: 'error', code: 'GAME_NOT_STARTED', message: '게임이 시작되지 않았습니다.' });
      return;
    }

    const expectedId = this.teamPlayerIds[this.state.activeTeam][this.state.activePlayerIndex];
    if (playerId !== expectedId) {
      this.sendTo(playerId, { type: 'error', code: 'NOT_YOUR_TURN', message: '지금은 당신의 차례가 아닙니다.' });
      return;
    }

    const key = `${r},${c}`;
    const card = this.state.board.get(key);
    if (!card || card.open || card.collectedBy !== null) {
      this.sendTo(playerId, { type: 'error', code: 'CARD_NOT_AVAILABLE', message: '선택할 수 없는 카드입니다.' });
      return;
    }

    const { state, events } = processPlayerAction(this.state, r, c);
    this.state = state;
    this.resetTimer();

    const clientEvents = serializeEvents(events);
    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });

    if (this.state.phase === 'ended') this.clearTimer();
  }

  handleTimeout(): void {
    if (!this.state || this.state.phase !== 'playing') return;

    const { state, events } = processTimeout(this.state);
    this.state = state;

    const openEv = events.find(e => e.type === 'open');
    const timeoutKey = openEv?.type === 'open' ? openEv.key : '';

    const clientEvents = serializeEvents(events);
    if (timeoutKey) {
      clientEvents.unshift({ type: 'timeout', key: timeoutKey });
    }

    if (this.state.phase === 'playing') {
      this.resetTimer();
    } else {
      this.clearTimer();
    }

    const clientState = serializeState(this.state, this.turnDeadline);
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });
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
