import type { WebSocket } from 'ws';
import type { Animal, Place, Team } from 'shared';
import type { ServerMessage } from 'shared';
import { processPlayerAction, processSkillChoice, processPass, processTimeout, initGame } from './engine/gameEngine';
import { randomEligibleSkill } from './engine/skills';
import type { GameState } from 'shared';
import { TURN_TIME_SEC, SHEEP_EXTRA_TIME_PER_DRAW_SEC, PLACES, TEAM_NAME_POOL } from 'shared';
import { serializeEvents, serializeState } from './serializer';

// 싱글 모드 컴퓨터 플레이어는 실제 WebSocket 연결이 없으므로 고정 ID로 취급한다.
const CPU_PLAYER_ID = 'CPU';
const CPU_NICKNAME = '컴퓨터';
const CPU_TEAM_NAME = '컴퓨터';
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
  private teamNames: Record<Team, string | null> = { A: null, B: null };
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

  /** 팀 이름을 확정한다. 이미 정해져 있으면 무시하고, 요청한 이름이 상대 팀과 겹치면 무작위로 대체한다. */
  private assignTeamName(team: Team, requested?: string): void {
    if (this.teamNames[team]) return;
    const other = this.teamNames[team === 'A' ? 'B' : 'A'];
    const trimmed = requested?.trim().slice(0, 12);
    if (trimmed && trimmed !== other) {
      this.teamNames[team] = trimmed;
      return;
    }
    const pool = TEAM_NAME_POOL.filter(n => n !== other);
    const name = pool[Math.floor(Math.random() * pool.length)] ?? (team === 'A' ? 'A팀' : 'B팀');
    this.teamNames[team] = name;
  }

  addPlayer(
    ws: WebSocket,
    playerId: string,
    nickname: string,
    team: Team,
    teamName?: string,
  ): 'ok' | 'game_started' | 'nickname_taken' {
    if (this.state !== null) return 'game_started';

    for (const p of this.players.values()) {
      if (p.nickname === nickname) return 'nickname_taken';
    }

    this.players.set(playerId, { ws, playerId, nickname, team, ready: false, connected: true });
    this.teamPlayerIds[team].push(playerId);
    this.assignTeamName(team, teamName);
    this.broadcastLobbyState();
    return 'ok';
  }

  /** 싱글 모드 — 사람은 A팀에 즉시 참가시키고, B팀은 컴퓨터(랜덤 클릭)로 채워 곧바로 게임을 시작한다. */
  addSoloPlayer(ws: WebSocket, playerId: string, nickname: string, teamName?: string): void {
    this.vsComputer = true;
    this.players.set(playerId, { ws, playerId, nickname, team: 'A', ready: true, connected: true });
    this.teamPlayerIds.A.push(playerId);
    this.teamPlayerIds.B.push(CPU_PLAYER_ID);
    this.assignTeamName('A', teamName);
    this.teamNames.B = CPU_TEAM_NAME;
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
    this.assignTeamName('A');
    this.assignTeamName('B');

    this.resetTimer();
    const clientState = serializeState(this.state, this.turnDeadline, this.finalTeamNames());
    this.broadcast({ type: 'gameStart', state: clientState });
    this.scheduleComputerActionIfNeeded();
  }

  private finalTeamNames(): Record<Team, string> {
    return {
      A: this.teamNames.A ?? 'A팀',
      B: this.teamNames.B ?? 'B팀',
    };
  }

  // ─── 게임 진행 ───────────────────────────────────────────────────────────

  /** 지금 결정을 내려야 하는 팀의 "대표 플레이어"(현재 activePlayerIndex)의 id. */
  private expectedPlayerId(team: Team): string | undefined {
    if (!this.state) return undefined;
    return this.teamPlayerIds[team][this.state.activePlayerIndex];
  }

  handleDrawCard(playerId: string, place: Place): void {
    if (!this.state || this.state.phase !== 'playing') {
      this.sendTo(playerId, { type: 'error', code: 'GAME_NOT_STARTED', message: '게임이 시작되지 않았습니다.' });
      return;
    }
    if (this.state.pendingChoice !== null) {
      this.sendTo(playerId, { type: 'error', code: 'NO_PENDING_CHOICE', message: '지금은 스킬을 선택할 차례입니다.' });
      return;
    }

    const expectedId = this.expectedPlayerId(this.state.activeTeam);
    if (playerId !== expectedId) {
      this.sendTo(playerId, { type: 'error', code: 'NOT_YOUR_TURN', message: '지금은 당신의 차례가 아닙니다.' });
      return;
    }

    const { state, events } = processPlayerAction(this.state, place);
    this.state = state;
    this.resetTimer();
    this.broadcastResult(events);

    if (this.state.phase === 'ended') this.clearTimer();
    else this.scheduleComputerActionIfNeeded();
  }

  handleChooseSkill(playerId: string, animal: Animal): void {
    if (!this.state || this.state.phase !== 'playing' || this.state.pendingChoice === null) {
      this.sendTo(playerId, { type: 'error', code: 'NO_PENDING_CHOICE', message: '지금은 스킬을 선택할 차례가 아닙니다.' });
      return;
    }

    const expectedId = this.expectedPlayerId(this.state.pendingChoice);
    if (playerId !== expectedId) {
      this.sendTo(playerId, { type: 'error', code: 'NOT_YOUR_TURN', message: '지금은 당신의 차례가 아닙니다.' });
      return;
    }

    const { state, events } = processSkillChoice(this.state, animal);
    this.state = state;
    this.resetTimer();
    this.broadcastResult(events);

    if (this.state.phase === 'ended') this.clearTimer();
    else this.scheduleComputerActionIfNeeded();
  }

  handlePassSkill(playerId: string): void {
    if (!this.state || this.state.phase !== 'playing' || this.state.pendingChoice === null) {
      this.sendTo(playerId, { type: 'error', code: 'NO_PENDING_CHOICE', message: '지금은 스킬을 선택할 차례가 아닙니다.' });
      return;
    }

    const expectedId = this.expectedPlayerId(this.state.pendingChoice);
    if (playerId !== expectedId) {
      this.sendTo(playerId, { type: 'error', code: 'NOT_YOUR_TURN', message: '지금은 당신의 차례가 아닙니다.' });
      return;
    }

    const { state, events } = processPass(this.state);
    this.state = state;
    this.resetTimer();
    this.broadcastResult(events);

    if (this.state.phase === 'ended') this.clearTimer();
    else this.scheduleComputerActionIfNeeded();
  }

  /** 싱글 모드 — 컴퓨터(B팀) 차례(장소 클릭 또는 스킬 선택)가 되면 잠시 "생각하는" 척한 뒤 무작위로 진행한다. */
  private scheduleComputerActionIfNeeded(): void {
    if (!this.vsComputer || !this.state || this.state.phase !== 'playing') return;
    const waitingTeam = this.state.pendingChoice ?? this.state.activeTeam;
    if (waitingTeam !== 'B') return;
    if (this.computerTimer !== null) return;

    const delay = CPU_THINK_MIN_MS + Math.floor(Math.random() * (CPU_THINK_MAX_MS - CPU_THINK_MIN_MS));
    this.computerTimer = setTimeout(() => {
      this.computerTimer = null;
      this.performComputerAction();
    }, delay);
  }

  private performComputerAction(): void {
    if (!this.state || this.state.phase !== 'playing') return;

    let result: { state: GameState; events: ReturnType<typeof processPlayerAction>['events'] };
    if (this.state.pendingChoice === 'B') {
      const animal = randomEligibleSkill(this.state, 'B');
      result = animal === null ? processPass(this.state) : processSkillChoice(this.state, animal);
    } else if (this.state.activeTeam === 'B' && this.state.pendingChoice === null) {
      const place = PLACES[Math.floor(Math.random() * PLACES.length)];
      result = processPlayerAction(this.state, place);
    } else {
      return;
    }

    this.state = result.state;
    this.resetTimer();
    this.broadcastResult(result.events);

    if (this.state.phase === 'ended') this.clearTimer();
    else this.scheduleComputerActionIfNeeded();
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

    const clientState = serializeState(this.state, this.turnDeadline, this.finalTeamNames());
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });

    if (this.state.phase === 'playing') this.scheduleComputerActionIfNeeded();
  }

  private broadcastResult(events: ReturnType<typeof processPlayerAction>['events']): void {
    if (!this.state) return;
    const clientEvents = serializeEvents(events);
    const clientState = serializeState(this.state, this.turnDeadline, this.finalTeamNames());
    this.broadcast({ type: 'actionResult', events: clientEvents, state: clientState });
  }

  // ─── 타이머 ──────────────────────────────────────────────────────────────

  /**
   * 30초가 기본이지만, 지금 막 시작된 턴에 실용신양 스킬로 예약해둔 추가 뽑기가 있다면
   * 그만큼(뽑기 1회당 10초) 시간을 더 준다. 카드 선택/스킬 선택 여부와 무관하게 항상
   * "이번에 결정해야 할 팀"의 예약된 추가 뽑기 수를 기준으로 계산한다 — 스킬 선택
   * 대기 중에는 그 팀이 이미 이번 액션에서 예약분을 소모했으므로 자연히 0이 되어
   * 순수 30초로 돌아간다.
   */
  private resetTimer(): void {
    this.clearTimer();
    const waitingTeam = this.state?.pendingChoice ?? this.state?.activeTeam;
    const pendingDraws = waitingTeam && this.state ? this.state.teams[waitingTeam].pendingExtraDraws : 0;
    const durationMs = (TURN_TIME_SEC + SHEEP_EXTRA_TIME_PER_DRAW_SEC * pendingDraws) * 1000;
    this.turnDeadline = Date.now() + durationMs;
    this.timerHandle = setTimeout(() => this.handleTimeout(), durationMs);
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
      this.sendTo(playerId, { type: 'lobbyState', players: this.buildLobbyPlayers(), teamNames: this.teamNames });
    } else {
      const clientState = serializeState(this.state, this.turnDeadline, this.finalTeamNames());
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
    this.broadcast({ type: 'lobbyState', players: this.buildLobbyPlayers(), teamNames: this.teamNames });
  }

  private buildLobbyPlayers() {
    return [...this.players.values()].map(p => ({
      nickname: p.nickname,
      team: p.team,
      ready: p.ready,
    }));
  }
}
