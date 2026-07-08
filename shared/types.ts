export type Animal = 'sheep' | 'rabbit' | 'mermaid' | 'tiger';
export type Team = 'A' | 'B';
export type CardNum = 1 | 2 | 3 | 4 | 5 | 6;
export type GamePhase = 'lobby' | 'playing' | 'ended';

export interface Card {
  animal: Animal;
  num: CardNum;
  open: boolean;
  collectedBy: Team | null;
  openedBy: Team | null; // 오픈했지만 아직 짝을 못 찾은 카드의 테두리 색 표시용
}

export interface TeamState {
  members: string[];
  scores: Record<Animal, number>;
  lastLevel: Record<Animal, number>;
  playerIndex: number;  // 팀 내 현재 차례 플레이어 인덱스 (N:N 로테이션)
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  activeTeam: Team;
  activePlayerIndex: number;
  board: Map<string, Card>;
  expanded: boolean;
  teams: Record<Team, TeamState>;
  winner: Team | 'draw' | null;
}

// 게임 이벤트 (클라이언트 연출 및 시뮬레이션 로그용)
export type GameEvent =
  | { type: 'open'; key: string; card: Card }
  | { type: 'collect'; animal: Animal; team: Team; score: number; keys: string[] }
  | { type: 'sheepChain'; count: number; level: number; team: Team }
  | { type: 'tigerAttack'; team: Team; dmg: number }
  | { type: 'rabbitBonus'; team: Team; bonus: number }
  | { type: 'mermaidCatchup'; team: Team; absorb: number }
  | { type: 'mermaidBonus'; team: Team; bonus: number }
  | { type: 'expand' }
  | { type: 'gameEnd'; winner: Team | 'draw' };
