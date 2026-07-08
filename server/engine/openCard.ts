import type { GameEvent, GameState } from 'shared';
import { applySheepEffect } from './effects/sheep';
import { applyTigerEffect } from './effects/tiger';
import { applyMermaidEffect } from './effects/mermaid';
import type { RNG } from './board';

/**
 * 카드 오픈 & 즉시 판정 — 플레이어 액션용.
 * 짝수 매칭 시 수집 후 tiger·mermaid 즉시 발동.
 * 실용신양은 이 액션(턴)이 끝난 뒤 항상 1회, 현재 점수 기준으로 발동한다(상시효과).
 * 상표토끼는 턴 종료 훅 (turnManager에서 호출).
 */
export function openCard(
  state: GameState,
  r: number,
  c: number,
  rng: RNG = Math.random,
): GameEvent[] {
  // 이 팀이 새 액션을 시작하는 시점 — 지난 액션에서 오픈해 둔(짝을 못 찾은)
  // 카드들의 하이라이트를 여기서 해제한다. 상대 턴 내내, 그리고 자기 턴이
  // 돌아와도 다음 오픈을 하기 전까지는 유지되다가, 바로 이 시점에 사라진다.
  for (const card of state.board.values()) {
    if (card.openedBy === state.activeTeam && card.collectedBy === null) {
      card.openedBy = null;
    }
  }

  const events = _openCard(state, `${r},${c}`, rng);
  // 실용신양 상시효과 — 이번에 어떤 카드를 열었든, 매치가 있었든 없었든
  // 이 팀의 현재 실용신양 점수만큼 항상 추가로 카드를 연다.
  events.push(...applySheepEffect(state, rng));
  return events;
}

/**
 * 실용신양 연쇄 전용 내부 오픈. tiger·mermaid는 여전히 즉시 발동한다.
 */
export function openCardInternal(
  state: GameState,
  key: string,
  rng: RNG,
): GameEvent[] {
  return _openCard(state, key, rng);
}

function _openCard(
  state: GameState,
  key: string,
  rng: RNG,
): GameEvent[] {
  const card = state.board.get(key);
  if (!card || card.open || card.collectedBy !== null) return [];

  card.open = true;
  card.openedBy = state.activeTeam;
  const events: GameEvent[] = [{ type: 'open', key, card }];

  // 보드 위 미획득 동일 animal 오픈 카드 집계
  const matchingKeys: string[] = [];
  for (const [k, boardCard] of state.board) {
    if (boardCard.animal === card.animal && boardCard.open && boardCard.collectedBy === null) {
      matchingKeys.push(k);
    }
  }

  if (matchingKeys.length % 2 === 0) {
    let scoreGain = 0;
    for (const k of matchingKeys) {
      const matched = state.board.get(k)!;
      matched.collectedBy = state.activeTeam;
      scoreGain += matched.num;
    }
    state.teams[state.activeTeam].scores[card.animal] += scoreGain;

    events.push({
      type: 'collect',
      animal: card.animal,
      team: state.activeTeam,
      score: scoreGain,
      keys: matchingKeys,
    });

    // 즉시 발동 이펙트
    events.push(...applyTigerEffect(state));
    events.push(...applyMermaidEffect(state));
  }

  return events;
}
