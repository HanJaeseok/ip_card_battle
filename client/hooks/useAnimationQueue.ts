'use client';

import { useEffect, useRef, useState } from 'react';
import type { Animal, ClientGameEvent, ClientGameState, Team } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

type DeltaKey = `${Team}:${Animal}`;
const deltaKeyOf = (t: Team, a: Animal): DeltaKey => `${t}:${a}`;
const teamLabel = (t: Team) => (t === 'A' ? '[A팀]' : '[B팀]');

export interface FloatingTextItem {
  id: number;
  text: string;
  team: Team;
  type: 'bonus' | 'penalty';
  animal?: Animal;
}

export interface CommentaryLine {
  id: number;
  text: string;
  team: Team | null; // null = 중립 (예: 보드 확장)
}

export interface RabbitFlight {
  id: number;
  team: Team;
  sourceKeys: string[];
}

export interface AnimationState {
  suppressedKeys: ReadonlySet<string>;
  reactionMap: ReadonlyMap<string, number>; // cardKey → num
  joltAllFaceDown: boolean;
  screenShakeLevel: number; // 0 = none, 1-4 = small, 5-7 = medium, 8+ = strong
  leafParticleCount: number;
  floatingTexts: FloatingTextItem[];
  rabbitFlights: RabbitFlight[];
  tigerSlash: { onTeam: Team; dmg: number } | null;
  tigerRecoil: { attackerTeam: Team } | null;
  mermaidEffect: { team: Team; type: 'catchup' | 'bonus' } | null;
  mermaidPopup: { team: Team } | null;
  boardBreathe: boolean;
  scoreFlash: ReadonlyMap<string, number>; // "team:animal" → flash id (for CSS re-trigger)
  collectGlowKeys: ReadonlyMap<string, string>; // cardKey → glow color
  expandQuake: boolean;
  expandBurst: number; // 0 = 없음, 그 외엔 먼지 파티클 seed
  commentary: CommentaryLine[];
  sheepOpenCount: Record<Team, number>; // 실용신양 연쇄로 추가 오픈된 누적 카드 수
}

const EMPTY_SET = new Set<string>() as ReadonlySet<string>;
const EMPTY_MAP_STR = new Map<string, number>() as ReadonlyMap<string, number>;
const EMPTY_SCORE_MAP = new Map<string, number>() as ReadonlyMap<string, number>;
const EMPTY_GLOW_MAP = new Map<string, string>() as ReadonlyMap<string, string>;

const FLIP_HALF = 125;     // ms — flip-out half
const FLIP_FULL = 250;     // ms — flip완료
const REACTION_DUR = 700;  // ms — wink/gold reaction
const CHAIN_STAGGER = 55;  // ms — per card in sheep chain
const CHAIN_MAX_VIS = 15;  // max cards with stagger; rest are instant
const SCORE_FLASH_DUR = 500;
const EFFECT_DUR = 1400;
const PAIR_GLOW_DUR = 500; // 페어 매칭 글로우 지속 시간
const COMMENTARY_MAX = 40; // 해설판 최대 줄 수
const TIGER_RECOIL_DUR = 500;
const TIGER_HIT_DUR = 900;
const MERMAID_POPUP_DUR = 2000;
const RABBIT_FLIGHT_DUR = 900;

const PAIR_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#22d3ee', '#818cf8', '#e879f9', '#f472b6',
];

let floatIdCounter = 0;

export function useAnimationQueue(
  lastEvents: ClientGameEvent[],
  gameState: ClientGameState | null,
): AnimationState {
  const [suppressedKeys, setSuppressedKeys] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [reactionMap, setReactionMap] = useState<ReadonlyMap<string, number>>(EMPTY_MAP_STR);
  const [joltAllFaceDown, setJoltAllFaceDown] = useState(false);
  const [screenShakeLevel, setScreenShakeLevel] = useState(0);
  const [leafParticleCount, setLeafParticleCount] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [rabbitFlights, setRabbitFlights] = useState<RabbitFlight[]>([]);
  const [tigerSlash, setTigerSlash] = useState<{ onTeam: Team; dmg: number } | null>(null);
  const [tigerRecoil, setTigerRecoil] = useState<{ attackerTeam: Team } | null>(null);
  const [mermaidEffect, setMermaidEffect] = useState<{ team: Team; type: 'catchup' | 'bonus' } | null>(null);
  const [mermaidPopup, setMermaidPopup] = useState<{ team: Team } | null>(null);
  const [boardBreathe, setBoardBreathe] = useState(false);
  const [scoreFlash, setScoreFlash] = useState<ReadonlyMap<string, number>>(EMPTY_SCORE_MAP);
  const [collectGlowKeys, setCollectGlowKeys] = useState<ReadonlyMap<string, string>>(EMPTY_GLOW_MAP);
  const [expandQuake, setExpandQuake] = useState(false);
  const [expandBurst, setExpandBurst] = useState(0);
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [sheepOpenCount, setSheepOpenCount] = useState<Record<Team, number>>({ A: 0, B: 0 });

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const sched = (fn: () => void, delayMs: number) => {
    const t = setTimeout(fn, delayMs);
    timersRef.current.push(t);
  };

  const addFloat = (text: string, team: Team, type: 'bonus' | 'penalty') => {
    const id = ++floatIdCounter;
    setFloatingTexts(prev => [...prev, { id, text, team, type }]);
    sched(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1200);
  };

  useEffect(() => {
    if (lastEvents.length === 0) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // ── Pass 0: 해설판 커멘터리 생성 (즉시 반영, 통합 로그) ─────────────────
    // 각 이벤트가 특정 (팀,동물) 점수에 미친 델타를 순서대로 모아두고,
    // 최종 gameState 값에서 역산해 이벤트별 "변동 전 -> 변동 후"를 복원한다.
    if (gameState) {
      type Slot = { id: string; key: DeltaKey; delta: number };
      const slots: Slot[] = [];

      lastEvents.forEach((ev, i) => {
        if (ev.type === 'collect') {
          slots.push({ id: `${i}:main`, key: deltaKeyOf(ev.team, ev.animal), delta: ev.score });
        } else if (ev.type === 'rabbitBonus') {
          slots.push({ id: `${i}:main`, key: deltaKeyOf(ev.team, 'rabbit'), delta: ev.bonus });
        } else if (ev.type === 'mermaidBonus') {
          slots.push({ id: `${i}:main`, key: deltaKeyOf(ev.team, 'mermaid'), delta: ev.bonus });
        } else if (ev.type === 'mermaidCatchup') {
          slots.push({ id: `${i}:main`, key: deltaKeyOf(ev.team, 'mermaid'), delta: ev.absorb });
        } else if (ev.type === 'tigerAttack') {
          const opp: Team = ev.team === 'A' ? 'B' : 'A';
          slots.push({ id: `${i}:sheep`, key: deltaKeyOf(opp, 'sheep'), delta: -ev.dmg });
          slots.push({ id: `${i}:rabbit`, key: deltaKeyOf(opp, 'rabbit'), delta: -ev.dmg });
        }
      });

      const byKey = new Map<DeltaKey, Slot[]>();
      slots.forEach(s => {
        if (!byKey.has(s.key)) byKey.set(s.key, []);
        byKey.get(s.key)!.push(s);
      });

      const range = new Map<string, { before: number; after: number }>();
      byKey.forEach((list, key) => {
        const [t, a] = key.split(':') as [Team, Animal];
        const final = gameState.teams[t].scores[a];
        const sumDelta = list.reduce((s, x) => s + x.delta, 0);
        let running = final - sumDelta;
        for (const s of list) {
          const before = running;
          const after = Math.max(0, running + s.delta);
          range.set(s.id, { before, after });
          running = after;
        }
      });

      const newLines: { team: Team | null; text: string }[] = [];
      lastEvents.forEach((ev, i) => {
        if (ev.type === 'collect') {
          const r = range.get(`${i}:main`)!;
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} ${ANIMAL_INFO[ev.animal].emoji} ${ANIMAL_INFO[ev.animal].name} +${ev.score}! (${r.before} → ${r.after})`,
          });
        } else if (ev.type === 'sheepChain') {
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} ${ANIMAL_INFO.sheep.emoji} 실용신양 연쇄! 카드 ${ev.count}장 추가 오픈!`,
          });
        } else if (ev.type === 'rabbitBonus') {
          const r = range.get(`${i}:main`)!;
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} ${ANIMAL_INFO.rabbit.emoji} 상표토끼 보너스 +${ev.bonus}! (${r.before} → ${r.after})`,
          });
        } else if (ev.type === 'mermaidBonus') {
          const r = range.get(`${i}:main`)!;
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} ${ANIMAL_INFO.mermaid.emoji} 디자인어 보너스 +${ev.bonus}! (${r.before} → ${r.after})`,
          });
        } else if (ev.type === 'mermaidCatchup') {
          const opp: Team = ev.team === 'A' ? 'B' : 'A';
          const r = range.get(`${i}:main`)!;
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} ${ANIMAL_INFO.mermaid.emoji} 디자인어 역전! ${opp}팀에게서 +${ev.absorb} 흡수! (${r.before} → ${r.after})`,
          });
        } else if (ev.type === 'tigerAttack') {
          const opp: Team = ev.team === 'A' ? 'B' : 'A';
          const rs = range.get(`${i}:sheep`)!;
          const rr = range.get(`${i}:rabbit`)!;
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} ${ANIMAL_INFO.tiger.emoji} 특허랑이 공격(⚔${ev.dmg})! ${opp}팀의 (${ANIMAL_INFO.sheep.emoji}) ${rs.before}→${rs.after}, (${ANIMAL_INFO.rabbit.emoji}) ${rr.before}→${rr.after}`,
          });
        } else if (ev.type === 'expand') {
          newLines.push({ team: null, text: '보드가 확장되었습니다!' });
        }
      });

      if (newLines.length > 0) {
        setCommentary(prev => {
          const appended = [
            ...prev,
            ...newLines.map(line => ({ id: ++floatIdCounter, text: line.text, team: line.team })),
          ];
          return appended.slice(-COMMENTARY_MAX);
        });
      }
    }

    // ── Pass 1: collect all keys that will be opened ──────────────────────
    const newOpenKeys = new Set<string>();
    lastEvents.forEach(ev => {
      if (ev.type === 'open') newOpenKeys.add(ev.key);
    });
    if (newOpenKeys.size > 0) setSuppressedKeys(newOpenKeys);

    // ── Pass 2: schedule animations ──────────────────────────────────────
    let cursor = 0;          // ms absolute time for sequential events
    let chainRemaining = 0;  // how many upcoming 'open' events are part of current chain
    let chainStaggerIdx = 0; // index within current chain (for stagger)
    let chainCursor = 0;     // time when current chain started
    let chainCount = 0;      // total cards in this chain (for end-time calculation)

    for (const ev of lastEvents) {
      if (ev.type === 'open') {
        const key = ev.key;
        const num = ev.card.num;

        let revealAt: number;
        if (chainRemaining > 0) {
          // part of a sheep chain → stagger
          const staggerIdx = Math.min(chainStaggerIdx, CHAIN_MAX_VIS);
          revealAt = chainCursor + staggerIdx * CHAIN_STAGGER;
          chainStaggerIdx++;
          chainRemaining--;
          if (chainRemaining === 0) {
            // advance cursor past entire chain
            cursor = chainCursor + Math.min(chainCount, CHAIN_MAX_VIS) * CHAIN_STAGGER + FLIP_FULL + 80;
          }
        } else {
          revealAt = cursor;
          cursor += FLIP_FULL + 80; // single flip + small gap
        }

        // Reveal card (triggers CardCell flip animation)
        sched(() => {
          setSuppressedKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, revealAt);

        // Add reaction after flip completes
        const reactionAt = revealAt + FLIP_FULL;
        sched(() => {
          setReactionMap(prev => new Map([...prev, [key, num]]));
        }, reactionAt);
        sched(() => {
          setReactionMap(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }, reactionAt + REACTION_DUR);

      } else if (ev.type === 'sheepChain') {
        chainRemaining = ev.count;
        chainStaggerIdx = 0;
        chainCount = ev.count;
        chainCursor = cursor; // chain starts at current cursor

        setSheepOpenCount(prev => ({ ...prev, [ev.team]: prev[ev.team] + ev.count }));

        const level = ev.level;
        sched(() => {
          setScreenShakeLevel(level);
          sched(() => setScreenShakeLevel(0), level >= 8 ? 700 : level >= 5 ? 500 : 250);

          if (level >= 5) {
            setLeafParticleCount(level >= 8 ? 8 : 4);
            sched(() => setLeafParticleCount(0), 3000);
          }
          if (level >= 8) {
            setJoltAllFaceDown(true);
            sched(() => setJoltAllFaceDown(false), 450);
          }
        }, cursor);

      } else if (ev.type === 'collect') {
        const { team, animal, keys } = ev;
        const flashKey = `${team}:${animal}`;
        const flashId = ++floatIdCounter;
        const glowColor = PAIR_COLORS[Math.floor(Math.random() * PAIR_COLORS.length)];

        // 페어 매칭 글로우 — 글로우가 끝나면 카드는 팀 색으로 비활성화된 채 계속 보인다
        sched(() => {
          setCollectGlowKeys(prev => {
            const next = new Map(prev);
            keys.forEach(k => next.set(k, glowColor));
            return next;
          });
        }, cursor);

        sched(() => {
          setCollectGlowKeys(prev => {
            const next = new Map(prev);
            keys.forEach(k => next.delete(k));
            return next;
          });

          setScoreFlash(prev => new Map([...prev, [flashKey, flashId]]));
          sched(() => {
            setScoreFlash(prev => {
              const next = new Map(prev);
              if (next.get(flashKey) === flashId) next.delete(flashKey);
              return next;
            });
          }, SCORE_FLASH_DUR);
        }, cursor + PAIR_GLOW_DUR);

        cursor += PAIR_GLOW_DUR + 80;

      } else if (ev.type === 'rabbitBonus') {
        const team = ev.team;
        // 현재 보드에 뒤집혀 있는 이 팀의 상표토끼 카드들에서 토끼가 날아오는 연출
        const sourceKeys = gameState
          ? gameState.board
              .filter(e => {
                if (!e.card.open || e.card.animal !== 'rabbit') return false;
                return (
                  e.card.collectedBy === team ||
                  (e.card.collectedBy === null && e.card.openedBy === team)
                );
              })
              .map(e => e.key)
          : [];

        sched(() => {
          if (sourceKeys.length > 0) {
            const flightId = ++floatIdCounter;
            setRabbitFlights(prev => [...prev, { id: flightId, team, sourceKeys }]);
            sched(() => {
              setRabbitFlights(prev => prev.filter(f => f.id !== flightId));
            }, RABBIT_FLIGHT_DUR);
          }
          addFloat(`+${ev.bonus}`, team, 'bonus');
        }, cursor);

      } else if (ev.type === 'tigerAttack') {
        const onTeam: Team = ev.team === 'A' ? 'B' : 'A';
        sched(() => {
          setTigerRecoil({ attackerTeam: ev.team });
          sched(() => setTigerRecoil(null), TIGER_RECOIL_DUR);
        }, cursor);
        sched(() => {
          // "-dmg" 플로팅은 실용신양·상표토끼 표(ScorePanel의 table-hit-float)에서
          // 직접 표시하므로, 여기서 위치가 부정확한 범용 addFloat는 사용하지 않는다.
          setTigerSlash({ onTeam, dmg: ev.dmg });
          sched(() => setTigerSlash(null), TIGER_HIT_DUR);
        }, cursor + 150);

      } else if (ev.type === 'mermaidCatchup') {
        sched(() => {
          setMermaidEffect({ team: ev.team, type: 'catchup' });
          setMermaidPopup({ team: ev.team });
          addFloat(`+${ev.absorb}`, ev.team, 'bonus');
          addFloat(`-${ev.absorb}`, ev.team === 'A' ? 'B' : 'A', 'penalty');
          sched(() => setMermaidEffect(null), EFFECT_DUR);
          sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
        }, cursor);

      } else if (ev.type === 'mermaidBonus') {
        sched(() => {
          setMermaidEffect({ team: ev.team, type: 'bonus' });
          setMermaidPopup({ team: ev.team });
          addFloat(`+${ev.bonus}`, ev.team, 'bonus');
          sched(() => setMermaidEffect(null), EFFECT_DUR);
          sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
        }, cursor);

      } else if (ev.type === 'expand') {
        const burstId = ++floatIdCounter;
        sched(() => {
          setBoardBreathe(true);
          setExpandQuake(true);
          setExpandBurst(burstId);
          sched(() => setBoardBreathe(false), 600);
          sched(() => setExpandQuake(false), 800);
          sched(() => setExpandBurst(0), 1100);
        }, cursor);
      }
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvents, gameState]);

  return {
    suppressedKeys,
    reactionMap,
    joltAllFaceDown,
    screenShakeLevel,
    leafParticleCount,
    floatingTexts,
    rabbitFlights,
    tigerSlash,
    tigerRecoil,
    mermaidEffect,
    mermaidPopup,
    boardBreathe,
    scoreFlash,
    collectGlowKeys,
    expandQuake,
    expandBurst,
    commentary,
    sheepOpenCount,
  };
}
