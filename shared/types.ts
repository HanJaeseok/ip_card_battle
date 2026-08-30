export type Animal = 'sheep' | 'rabbit' | 'mermaid' | 'tiger';
export type Team = 'A' | 'B';
export type CardNum = 1 | 2 | 3 | 4 | 5 | 6;
export type GamePhase = 'lobby' | 'playing' | 'ended';

// 맵 네 모서리의 장소 — 각 장소를 클릭하면 괄호 안 동물 중 하나가 무작위로 나온다.
export type Place = 'house' | 'forest_road' | 'dock' | 'river_road';

export const PLACES: Place[] = ['house', 'forest_road', 'dock', 'river_road'];

export const PLACE_ANIMALS: Record<Place, Animal[]> = {
  house: ['rabbit', 'sheep'],               // 오두막 — 토끼, 양
  forest_road: ['rabbit', 'sheep', 'tiger'], // 숲길 — 토끼, 양, 호랑이
  dock: ['mermaid', 'tiger'],                // 부둣가 — 인어, 호랑이
  river_road: ['mermaid', 'rabbit', 'tiger'], // 강가 — 인어, 토끼, 호랑이
};

// 중앙 동물 스택에 쌓이는 카드 한 장. 뽑히는 즉시 공개되므로 숨김 상태가 없다.
export interface StackedCard {
  id: number;
  animal: Animal;
  num: CardNum;
  collectedBy: Team | null;
}

export interface TeamState {
  members: string[];
  scores: Record<Animal, number>;      // 동물별 누적 점수 = 경험치 (레벨 = floor(score/threshold))
  pendingExtraDraws: number;           // 실용신양 스킬로 예약된, 다음 내 턴에 추가로 뽑을 카드 수
  playerIndex: number;                 // 팀 내 현재 차례 플레이어 인덱스 (N:N 로테이션)
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  activeTeam: Team;
  activePlayerIndex: number;
  stacks: Record<Animal, StackedCard[]>;      // 동물별 중앙 카드 스택 (수집된 카드도 기록으로 남음)
  expanded: boolean;                          // EXPAND_TURN 이후 여부 — 이때부터 폭탄이 등장한다
  pendingChoice: Team | null;                 // 턴을 마친 팀이 4가지 스킬 중 하나를 고르길 기다리는 중
  teams: Record<Team, TeamState>;
  winner: Team | 'draw' | null;
}

// 게임 이벤트 (클라이언트 연출 및 시뮬레이션 로그용)
export type GameEvent =
  | { type: 'draw'; place: Place; card: StackedCard }
  | { type: 'bomb'; place: Place; animal: Animal; clearedCards: StackedCard[] } // 해당 동물 미획득 스택을 전부 날려버림(도토리 폭탄)
  | { type: 'collect'; animal: Animal; team: Team; score: number; cardIds: number[] }
  | { type: 'bonusDraws'; team: Team; count: number } // 실용신양 스킬로 예약해둔 추가 뽑기를 이번 턴에 소모
  | {
      type: 'skillApplied';
      team: Team;
      animal: Animal;
      myScoreDelta: number;   // 내 점수(해당 동물 버킷)에 더해진 값
      oppScoreDelta: number;  // 상대 총점에서 깎인 값(양수로 표기, 실제로는 감소)
      extraDrawsQueued: number; // 실용신양을 골랐을 때, 다음 내 턴에 예약된 추가 뽑기 수
    }
  | { type: 'expand' }
  | { type: 'gameEnd'; winner: Team | 'draw' }
  | { type: 'timeout'; place: Place }
  | { type: 'timeoutChoice'; animal: Animal }; // 스킬 선택 제한시간 초과로 서버가 대신 무작위 선택
