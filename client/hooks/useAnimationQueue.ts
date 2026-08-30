'use client';

import { useEffect, useRef, useState } from 'react';
import type { Animal, ClientGameEvent, ClientGameState, Team } from 'shared';
import { THRESHOLDS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';
import { playRandomSound, playRandomSoundSequence } from '@/lib/sounds';

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

export interface SheepCombo {
  id: number;
  key: string; // 추가 오픈된 카드의 위치 키
  combo: number; // 1부터 시작하는 콤보 번호
}

export interface MainCombo {
  id: number;
  combo: number; // 이번 연쇄의 최종 콤보 수
}

export interface RabbitPressure {
  sourceTeam: Team; // 토끼가 불어난 팀
  targetTeam: Team; // 압박을 느껴야 할 상대 팀
}

export interface CaptionItem {
  id: number;
  text: string;
  tier: 'flip' | 'pair' | 'effect'; // 무엇을 뒤집었는지 / 페어 성사 / 효과 발동
  cardKey?: string; // flip/pair는 해당 카드 위에 앵커링, effect는 보드 중앙 고정(생략)
}

export interface PlayerEmoticon {
  id: number;
  team: Team;
  playerIndex: number; // 팀 내 이 플레이어의 인덱스 (프로필 목록 앵커용)
  file: string;         // /emoticon/{file}.png
  stackIndex: number;   // 같은 앵커에 몇 번째로 겹쳐 쌓였는지 (크기/z-index 산출용)
}

export interface CardFocusItem {
  id: number;
  cardKey: string;
}

type EmoticonMood = 'happy' | 'burn' | 'cry' | 'stone' | 'focus';

function emoticonFile(animal: Animal, mood: EmoticonMood): string {
  return `${animal}_${mood}`;
}

function sumScores(scores: Record<Animal, number>): number {
  return scores.sheep + scores.rabbit + scores.mermaid + scores.tiger;
}

// 50/50 판정은 Math.random()을 쓰면 두 클라이언트가 서로 다른 결과를 그려 화면이
// 어긋난다. 양쪽이 동일하게 받는 이벤트 수치로 시드를 만들어 결정론적으로 고른다.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
function seededPick<T>(seed: string, a: T, b: T): T {
  return (hashString(seed) & 1) === 0 ? a : b;
}

interface EmoticonPlanItem {
  team: Team;
  animal: Animal;
  mood: EmoticonMood;
}

/**
 * 이번 액션(카드 오픈 1회 ~ 실용신양 연쇄 포함)의 이벤트와 전/후 점수를 보고
 * "턴인 사람"과 "상대(피해자)" 이모티콘을 어떤 걸 띄울지 판정한다.
 *
 * 우선순위 규칙:
 * - 실용신양은 "레벨 상승(강화)"을 그 외의 "여러 장 뒤집었지만 무소득"보다 우선한다.
 * - 네 동물은 서로 배타적이지 않으므로(같은 액션에서 여러 동물이 동시에 관여 가능)
 *   해당하는 것을 전부 큐에 쌓는다 — 여러 개면 화면에서 겹쳐 쌓이며 표시된다.
 * - 단순히 카드 한 장만 열고 페어가 안 된 경우는 너무 사소해 이모티콘을 띄우지 않는다.
 */
function buildEmoticonPlan(
  events: ClientGameEvent[],
  before: Record<Team, Record<Animal, number>>,
  after: Record<Team, Record<Animal, number>>,
  actingTeam: Team,
): EmoticonPlanItem[] {
  const opp: Team = actingTeam === 'A' ? 'B' : 'A';
  const plan: EmoticonPlanItem[] = [];

  const openedCount: Record<Animal, number> = { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 };
  const collectedAnimals = new Set<Animal>();
  events.forEach(ev => {
    if (ev.type === 'open') openedCount[ev.card.animal]++;
    else if (ev.type === 'collect') collectedAnimals.add(ev.animal);
  });

  const rabbitBonus = events.find(
    (e): e is Extract<ClientGameEvent, { type: 'rabbitBonus' }> => e.type === 'rabbitBonus',
  );
  const tigerAttack = events.find(
    (e): e is Extract<ClientGameEvent, { type: 'tigerAttack' }> => e.type === 'tigerAttack',
  );
  const mermaidBonus = events.find(
    (e): e is Extract<ClientGameEvent, { type: 'mermaidBonus' }> => e.type === 'mermaidBonus',
  );
  const mermaidCatchup = events.find(
    (e): e is Extract<ClientGameEvent, { type: 'mermaidCatchup' }> => e.type === 'mermaidCatchup',
  );
  const sheepChains = events.filter(e => e.type === 'sheepChain');

  const totalAfterAct = sumScores(after[actingTeam]);
  const totalAfterOpp = sumScores(after[opp]);
  const isAhead = totalAfterAct > totalAfterOpp;

  // ── 턴인 사람 ──────────────────────────────────────────────────────────
  if (rabbitBonus) {
    plan.push({ team: actingTeam, animal: 'rabbit', mood: isAhead ? 'happy' : 'burn' });
  }

  const sheepLevelBefore = Math.floor(before[actingTeam].sheep / THRESHOLDS.sheep);
  const sheepLevelAfter = Math.floor(after[actingTeam].sheep / THRESHOLDS.sheep);
  if (sheepChains.length > 0 && sheepLevelAfter > sheepLevelBefore) {
    plan.push({ team: actingTeam, animal: 'sheep', mood: 'focus' });
  } else if (openedCount.sheep >= 2 && !collectedAnimals.has('sheep')) {
    plan.push({ team: actingTeam, animal: 'sheep', mood: 'happy' });
  }

  if (mermaidBonus) {
    plan.push({ team: actingTeam, animal: 'mermaid', mood: 'happy' });
  } else if (mermaidCatchup) {
    const mood = isAhead
      ? 'happy'
      : seededPick(`mermaid:${actingTeam}:${mermaidCatchup.absorb}:${totalAfterAct}`, 'burn', 'focus');
    plan.push({ team: actingTeam, animal: 'mermaid', mood });
  }

  if (tigerAttack) {
    const mood = isAhead
      ? 'happy'
      : seededPick(`tiger:${actingTeam}:${tigerAttack.dmg}:${totalAfterAct}`, 'burn', 'focus');
    plan.push({ team: actingTeam, animal: 'tiger', mood });
  }

  // ── 상대(피해자) ──────────────────────────────────────────────────────
  if (tigerAttack) {
    const sheepDrop = before[opp].sheep - after[opp].sheep;
    const rabbitDrop = before[opp].rabbit - after[opp].rabbit;
    if (rabbitDrop > sheepDrop) plan.push({ team: opp, animal: 'rabbit', mood: 'cry' });
    else if (sheepDrop > rabbitDrop) plan.push({ team: opp, animal: 'sheep', mood: 'cry' });
    else if (sheepDrop > 0) {
      plan.push({ team: opp, animal: 'rabbit', mood: 'cry' });
      plan.push({ team: opp, animal: 'sheep', mood: 'cry' });
    }
  }
  if (mermaidCatchup) {
    const sheepDrop = before[opp].sheep - after[opp].sheep;
    const rabbitDrop = before[opp].rabbit - after[opp].rabbit;
    if (rabbitDrop > 0) plan.push({ team: opp, animal: 'rabbit', mood: 'cry' });
    if (sheepDrop > 0) plan.push({ team: opp, animal: 'sheep', mood: 'cry' });
  }

  return plan;
}

export interface AnimationState {
  suppressedKeys: ReadonlySet<string>;
  recentlyOpenedKeys: ReadonlySet<string>; // 이번 액션에서 새로 뒤집힌 카드 — 이전 턴 정보는 노출하지 않는다
  reactionMap: ReadonlyMap<string, number>; // cardKey → num
  joltAllFaceDown: boolean;
  screenShakeLevel: number; // 0 = none, 그 외엔 실용신양 콤보 번호(진동 강도 스케일 산출용)
  leafParticleCount: number;
  floatingTexts: FloatingTextItem[];
  rabbitFlights: RabbitFlight[];
  rabbitPressure: RabbitPressure | null;
  sheepCombos: SheepCombo[];
  mainCombo: MainCombo | null;
  tigerSlash: { onTeam: Team; dmg: number } | null;
  tigerRecoil: { attackerTeam: Team } | null;
  tigerImpact: boolean;
  mermaidEffect: { team: Team; type: 'catchup' | 'bonus' } | null;
  mermaidPopup: { team: Team } | null;
  boardBreathe: boolean;
  scoreFlash: ReadonlyMap<string, number>; // "team:animal" → flash id (for CSS re-trigger)
  collectGlowKeys: ReadonlyMap<string, string>; // cardKey → glow color
  expandQuake: boolean;
  expandBurst: number; // 0 = 없음, 그 외엔 먼지 파티클 seed
  commentary: CommentaryLine[];
  captions: CaptionItem[];
  emoticons: PlayerEmoticon[];
  cardFocusBursts: CardFocusItem[];
}

const EMPTY_SET = new Set<string>() as ReadonlySet<string>;
const EMPTY_MAP_STR = new Map<string, number>() as ReadonlyMap<string, number>;
const EMPTY_SCORE_MAP = new Map<string, number>() as ReadonlyMap<string, number>;
const EMPTY_GLOW_MAP = new Map<string, string>() as ReadonlyMap<string, string>;

const FLIP_HALF = 125;     // ms — flip-out half
const FLIP_IN_DUR = 180;   // ms — flip-in + 펀치 바운스
const FLIP_FULL = FLIP_HALF + FLIP_IN_DUR; // ms — flip 전체 완료 시점
const REACTION_DUR = 700;  // ms — wink/gold reaction
const EMPTY_GAP = 80;          // ms — 효과 없는 일반 오픈 뒤 다음 이벤트까지 여백
const CHAIN_EMPTY_GAP = 320;   // ms — 연쇄 중 효과 없는 카드는 "그냥 넘어가되" 눈에는 보이게
const EFFECT_SETTLE_GAP = 150; // ms — 카드의 효과 정산이 끝난 뒤 다음 카드로 넘어가기 전 여백
const CARD_FLIP_BASE_VOLUME = 0.6; // 실용신양 연쇄 첫 카드의 뒤집기 음량
const CARD_FLIP_VOLUME_STEP = 0.05; // 연쇄 카드 한 장마다 음량 증가폭 (5%)
// 즉시발동 효과 이벤트 타입 — 서버가 카드를 연 직후 그 카드의 매치 판정 결과로 곧바로
// 이어붙여 생성하므로, 'open' 뒤에 연속으로 나오는 이 타입들은 "그 카드의 정산 내용"이다.
const GROUPED_EFFECT_TYPES = new Set(['collect', 'tigerAttack', 'mermaidCatchup', 'mermaidBonus']);
const SCORE_FLASH_DUR = 500;
const EFFECT_DUR = 1400;
const PAIR_GLOW_DUR = 500; // 페어 매칭 글로우 지속 시간
const COMMENTARY_MAX = 40; // 해설판 최대 줄 수
const TIGER_RECOIL_DUR = 500;
const TIGER_HIT_DUR = 900;
const MERMAID_POPUP_DUR = 2000;
const RABBIT_FLIGHT_DUR = 900;
const SHEEP_COMBO_DUR = 1400;
const SHAKE_PULSE_DUR = 300; // ms — 콤보 1회당 진동 지속시간
const MAIN_COMBO_DUR = 1300; // ms — 화면 중앙 메인 콤보 카운터 지속시간
const RABBIT_PRESSURE_DUR = 700; // ms — 상대 팀 압박 경고 지속시간

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
  const [recentlyOpenedKeys, setRecentlyOpenedKeys] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [reactionMap, setReactionMap] = useState<ReadonlyMap<string, number>>(EMPTY_MAP_STR);
  const [joltAllFaceDown, setJoltAllFaceDown] = useState(false);
  const [screenShakeLevel, setScreenShakeLevel] = useState(0);
  const [leafParticleCount, setLeafParticleCount] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [rabbitFlights, setRabbitFlights] = useState<RabbitFlight[]>([]);
  const [rabbitPressure, setRabbitPressure] = useState<RabbitPressure | null>(null);
  const [sheepCombos, setSheepCombos] = useState<SheepCombo[]>([]);
  const [mainCombo, setMainCombo] = useState<MainCombo | null>(null);
  const [tigerSlash, setTigerSlash] = useState<{ onTeam: Team; dmg: number } | null>(null);
  const [tigerRecoil, setTigerRecoil] = useState<{ attackerTeam: Team } | null>(null);
  const [tigerImpact, setTigerImpact] = useState(false);
  const [mermaidEffect, setMermaidEffect] = useState<{ team: Team; type: 'catchup' | 'bonus' } | null>(null);
  const [mermaidPopup, setMermaidPopup] = useState<{ team: Team } | null>(null);
  const [boardBreathe, setBoardBreathe] = useState(false);
  const [scoreFlash, setScoreFlash] = useState<ReadonlyMap<string, number>>(EMPTY_SCORE_MAP);
  const [collectGlowKeys, setCollectGlowKeys] = useState<ReadonlyMap<string, string>>(EMPTY_GLOW_MAP);
  const [expandQuake, setExpandQuake] = useState(false);
  const [expandBurst, setExpandBurst] = useState(0);
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [emoticons, setEmoticons] = useState<PlayerEmoticon[]>([]);
  const [cardFocusBursts, setCardFocusBursts] = useState<CardFocusItem[]>([]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 다음 액션이 들어올 때 timersRef를 통째로 비우기 때문에, 그보다 오래 지속되는
  // 이모티콘 등의 "제거" 타이머는 여기 따로 담아 언마운트 시에만 정리한다.
  // (안 그러면 제거 타이머가 취소되어 이모티콘이 화면에 영구히 쌓이는 버그가 생긴다)
  const persistentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => persistentTimersRef.current.forEach(clearTimeout), []);

  // 직전 액션 종료 시점의 팀별 점수 스냅샷 — 이번 액션의 전/후 비교(이모티콘 판정용)에 쓴다.
  const prevScoresRef = useRef<Record<Team, Record<Animal, number>> | null>(null);

  // gameState는 애니메이션 스케줄링(Pass 0의 델타 역산, rabbitBonus 소스 카드 탐색)에
  // 필요하지만, 아래 effect의 의존성으로 넣으면 안 된다 — actionResult 없이 gameState만
  // 갱신되는 gameSnapshot(재접속 등) 수신 시에도 effect가 재실행되어, 이미 끝난 지난 턴의
  // lastEvents 애니메이션(페어 매칭 글로우 등)이 처음부터 다시 재생되는 버그가 있었다.
  // ref로 최신값만 읽고, effect는 lastEvents가 바뀔 때만 실행되게 한다.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const sched = (fn: () => void, delayMs: number) => {
    const t = setTimeout(fn, delayMs);
    timersRef.current.push(t);
  };

  const addFloat = (text: string, team: Team, type: 'bonus' | 'penalty') => {
    const id = ++floatIdCounter;
    setFloatingTexts(prev => [...prev, { id, text, team, type }]);
    sched(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1200);
  };

  const CAPTION_DUR: Record<CaptionItem['tier'], number> = { flip: 550, pair: 800, effect: 950 };
  const addCaption = (text: string, tier: CaptionItem['tier'], atMs: number, cardKey?: string) => {
    const id = ++floatIdCounter;
    sched(() => {
      setCaptions(prev => [...prev, { id, text, tier, cardKey }]);
      sched(() => setCaptions(prev => prev.filter(c => c.id !== id)), CAPTION_DUR[tier]);
    }, atMs);
  };

  const EMOTICON_DUR = 2000; // 2초 후 페이드아웃하며 사라짐 (CSS 애니메이션 길이와 일치시켜야 함)
  const addEmoticon = (team: Team, playerIndex: number, file: string, stackIndex: number, atMs: number) => {
    const id = ++floatIdCounter;
    sched(() => {
      setEmoticons(prev => [...prev, { id, team, playerIndex, file, stackIndex }]);
      // 제거 타이머는 새 액션이 와도 취소되면 안 되므로 persistentTimersRef에 담는다.
      const removeTimer = setTimeout(() => {
        setEmoticons(prev => prev.filter(e => e.id !== id));
      }, EMOTICON_DUR);
      persistentTimersRef.current.push(removeTimer);
    }, atMs);
  };

  const CARD_FOCUS_DUR = 480;
  const addCardFocus = (cardKey: string, atMs: number) => {
    const id = ++floatIdCounter;
    sched(() => {
      setCardFocusBursts(prev => [...prev, { id, cardKey }]);
      const removeTimer = setTimeout(() => {
        setCardFocusBursts(prev => prev.filter(f => f.id !== id));
      }, CARD_FOCUS_DUR);
      persistentTimersRef.current.push(removeTimer);
    }, atMs);
  };

  useEffect(() => {
    if (lastEvents.length === 0) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // ── Pass 0: 해설판 커멘터리 생성 (즉시 반영, 통합 로그) ─────────────────
    // 각 이벤트가 특정 (팀,동물) 점수에 미친 델타를 순서대로 모아두고,
    // 최종 gameState 값에서 역산해 이벤트별 "변동 전 -> 변동 후"를 복원한다.
    const gameState = gameStateRef.current;
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
            text: `${teamLabel(ev.team)} 추가 카드 ${ev.count}장 오픈!`,
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
    if (newOpenKeys.size > 0) {
      setSuppressedKeys(newOpenKeys);
      // 이번 액션에서 새로 열린 카드만 강조한다 — 다음 액션이 오면 이 Set 자체가
      // 교체되므로 이전 턴에 열어둔 카드의 강조는 자연히 사라진다.
      setRecentlyOpenedKeys(newOpenKeys);
    }

    // ── Pass 2: schedule animations ──────────────────────────────────────
    // 한 액션 안에서 여러 장이 열릴 수 있다(실용신양 연쇄). 카드 하나가 열릴 때마다
    // 그 카드의 매치/타이거/인어 효과가 있으면 "다 정산될 때까지" 기다린 뒤에야
    // 다음 카드를 연다 — 효과가 없으면 곧바로 다음 카드로 넘어간다.
    let cursor = 0;          // ms absolute time for sequential events
    let chainRemaining = 0;  // how many upcoming 'open' events are part of current chain
    let chainIdx = 0;        // index within current chain (for pitch/combo escalation)
    let comboCounter = 0;    // 이번 턴 누적 실용신양 추가 오픈 콤보 번호 (1부터)

    let idx = 0;
    while (idx < lastEvents.length) {
      const ev = lastEvents[idx];

      if (ev.type === 'open') {
        const key = ev.key;
        const num = ev.card.num;
        const revealAt = cursor;
        const inChain = chainRemaining > 0;

        // 이 카드에 곧바로 딸린 효과 그룹(collect → tiger?/mermaid?)을 미리 훑어둔다.
        let j = idx + 1;
        const group: ClientGameEvent[] = [];
        while (j < lastEvents.length && GROUPED_EFFECT_TYPES.has(lastEvents[j].type)) {
          group.push(lastEvents[j]);
          j++;
        }

        if (inChain) {
          chainRemaining--;
          chainIdx++;
          const combo = ++comboCounter;
          // 진행될수록 피치를 살짝 올려 고조감을 준다 (속도 자체는 올리지 않는다)
          const pitch = Math.min(1.35, 1 + (chainIdx - 1) * 0.035);
          sched(() => playRandomSound('sheep', pitch), revealAt);

          const comboId = ++floatIdCounter;
          sched(() => {
            setSheepCombos(prev => [...prev, { id: comboId, key, combo }]);
            sched(() => {
              setSheepCombos(prev => prev.filter(c => c.id !== comboId));
            }, SHEEP_COMBO_DUR);

            // 콤보마다 진동 — 1콤보는 약하게 시작해 콤보가 쌓일수록 점점 강해진다
            setScreenShakeLevel(combo);
            sched(() => setScreenShakeLevel(0), SHAKE_PULSE_DUR);
          }, revealAt);

          if (chainRemaining === 0) {
            const finalId = ++floatIdCounter;
            sched(() => {
              setMainCombo({ id: finalId, combo });
              sched(() => setMainCombo(null), MAIN_COMBO_DUR);
            }, revealAt + FLIP_FULL);
          }
        }

        // 카드 뒤집는 효과음 — 매번 랜덤 재생. 실용신양 연쇄로 계속 더 뒤집을수록
        // 몰아치는 느낌을 주기 위해 카드마다 음량을 5%씩 키운다(최대 100%).
        const cardVolume = inChain ? Math.min(1, CARD_FLIP_BASE_VOLUME + (chainIdx - 1) * CARD_FLIP_VOLUME_STEP) : 1;
        sched(() => playRandomSound('card', 1, cardVolume), revealAt);

        // 지금 뒤집히는 카드로 시선을 모으는 포커스 연출
        addCardFocus(key, revealAt);

        // 카드 뒤집기
        sched(() => {
          setSuppressedKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, revealAt);

        // 뒤집기 완료 후 숫자별 리액션
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

        // 무엇을 뒤집었는지 큰 자막으로 강조 — 그 카드 바로 위에 표시
        addCaption(`${ANIMAL_INFO[ev.card.animal].short}!`, 'flip', reactionAt, key);

        // 이 카드에 딸린 효과를 순서대로("정산") 재생 — 하나씩 끝나야 다음 단계로 넘어간다
        let t = reactionAt;
        for (const gev of group) {
          if (gev.type === 'collect') {
            const { team, animal, keys } = gev;
            const flashKey = `${team}:${animal}`;
            const flashId = ++floatIdCounter;
            const glowColor = PAIR_COLORS[Math.floor(Math.random() * PAIR_COLORS.length)];
            const at = t;

            addCaption(`${ANIMAL_INFO[animal].short} 페어!`, 'pair', at, keys[0]);

            sched(() => {
              setCollectGlowKeys(prev => {
                const next = new Map(prev);
                keys.forEach(k => next.set(k, glowColor));
                return next;
              });
            }, at);

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
            }, at + PAIR_GLOW_DUR);

            t += PAIR_GLOW_DUR + 80;

          } else if (gev.type === 'tigerAttack') {
            const onTeam: Team = gev.team === 'A' ? 'B' : 'A';
            const at = t;

            addCaption('특허랑이 발동!', 'effect', at + 150);

            sched(() => {
              setTigerRecoil({ attackerTeam: gev.team });
              sched(() => setTigerRecoil(null), TIGER_RECOIL_DUR);
            }, at);
            sched(() => {
              // "-dmg" 플로팅은 실용신양·상표토끼 표(ScorePanel의 table-hit-float)에서
              // 직접 표시하므로, 여기서 위치가 부정확한 범용 addFloat는 사용하지 않는다.
              setTigerSlash({ onTeam, dmg: gev.dmg });
              setTigerImpact(true);
              playRandomSound('tiger');
              sched(() => setTigerSlash(null), TIGER_HIT_DUR);
              sched(() => setTigerImpact(false), 600);
            }, at + 150);

            t += 150 + TIGER_HIT_DUR;

          } else if (gev.type === 'mermaidCatchup') {
            const at = t;
            addCaption('디자인어 발동!', 'effect', at);
            sched(() => {
              setMermaidEffect({ team: gev.team, type: 'catchup' });
              setMermaidPopup({ team: gev.team });
              playRandomSound('mermaid');
              addFloat(`+${gev.absorb}`, gev.team, 'bonus');
              addFloat(`-${gev.absorb}`, gev.team === 'A' ? 'B' : 'A', 'penalty');
              sched(() => setMermaidEffect(null), EFFECT_DUR);
              sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
            }, at);
            t += EFFECT_DUR;

          } else if (gev.type === 'mermaidBonus') {
            const at = t;
            addCaption('디자인어 발동!', 'effect', at);
            sched(() => {
              setMermaidEffect({ team: gev.team, type: 'bonus' });
              setMermaidPopup({ team: gev.team });
              playRandomSound('mermaid');
              addFloat(`+${gev.bonus}`, gev.team, 'bonus');
              sched(() => setMermaidEffect(null), EFFECT_DUR);
              sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
            }, at);
            t += EFFECT_DUR;
          }
        }

        // 다음 카드까지의 여백 — 효과가 있었으면 정산이 끝난 뒤 짧게, 없으면("없으면 넘어가고")
        // 연쇄 중엔 눈에 보일 정도로, 일반 오픈이면 거의 곧바로.
        const gap = group.length > 0 ? EFFECT_SETTLE_GAP : (inChain ? CHAIN_EMPTY_GAP : EMPTY_GAP);
        cursor = t + gap;
        idx = j;
        continue;

      } else if (ev.type === 'sheepChain') {
        chainRemaining = ev.count;
        chainIdx = 0;

        addCaption('실용신양 강화!', 'effect', cursor);

        const level = ev.level;
        sched(() => {
          if (level >= 5) {
            setLeafParticleCount(level >= 8 ? 8 : 4);
            sched(() => setLeafParticleCount(0), 3000);
          }
          if (level >= 8) {
            setJoltAllFaceDown(true);
            sched(() => setJoltAllFaceDown(false), 450);
          }
        }, cursor);

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

        addCaption('상표토끼 발동!', 'effect', cursor);

        sched(() => {
          // 효과음은 발동 즉시 재생 — 날아가는 연출이 끝날 때까지 기다리면 싱크가 어긋난다.
          const digits = String(Math.max(1, ev.bonus)).length;
          playRandomSoundSequence('rabbit', digits);

          if (sourceKeys.length > 0) {
            const flightId = ++floatIdCounter;
            setRabbitFlights(prev => [...prev, { id: flightId, team, sourceKeys }]);
            sched(() => {
              setRabbitFlights(prev => prev.filter(f => f.id !== flightId));
            }, RABBIT_FLIGHT_DUR);
          }
          addFloat(`+${ev.bonus}`, team, 'bonus');

          // 상대 팀에게 "토끼가 불어나고 있다"는 압박을 짧게 경고 — 약한 진동 + 패널 강조
          const targetTeam: Team = team === 'A' ? 'B' : 'A';
          setRabbitPressure({ sourceTeam: team, targetTeam });
          setScreenShakeLevel(prev => Math.max(prev, Math.min(2, 0.6 + ev.bonus / 25)));
          sched(() => {
            setRabbitPressure(null);
            setScreenShakeLevel(0);
          }, RABBIT_PRESSURE_DUR);
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
      // 'collect'/'tigerAttack'/'mermaidCatchup'/'mermaidBonus'는 항상 직전 'open'의
      // 효과 그룹으로 이미 소비되므로 여기까지 단독으로 도달하지 않는다.
      idx++;
    }

    // ── Pass 3: 플레이어 이모티콘 판정 (턴인 사람 / 상대) ───────────────────
    // 게임이 끝나는 액션은 턴 로테이션이 갱신되지 않아 앵커 역산이 어긋날 수 있으므로 건너뛴다.
    if (gameState && gameState.phase !== 'ended') {
      const beforeScores = prevScoresRef.current;
      const afterScores: Record<Team, Record<Animal, number>> = {
        A: { ...gameState.teams.A.scores },
        B: { ...gameState.teams.B.scores },
      };

      if (beforeScores) {
        const anyTeamEvent = lastEvents.find(
          (e): e is Extract<ClientGameEvent, { team: Team }> => 'team' in e,
        );
        const actingTeam: Team = anyTeamEvent?.team ?? (gameState.activeTeam === 'A' ? 'B' : 'A');
        const plan = buildEmoticonPlan(lastEvents, beforeScores, afterScores, actingTeam);

        if (plan.length > 0) {
          // 방금 플레이한 팀은 turnManager가 이미 playerIndex를 다음 차례로 돌려놨으므로 역산한다.
          const actingMembers = gameState.teams[actingTeam].members.length;
          const actingJustPlayedIdx =
            (gameState.teams[actingTeam].playerIndex - 1 + actingMembers) % actingMembers;

          const stackCounter = new Map<string, number>(); // 앵커(팀:인덱스)별 스택 카운트
          let emoticonCursor = cursor + 200; // 카드/효과 연출이 끝난 뒤 이어서 순차 등장
          plan.forEach(item => {
            const playerIndex =
              item.team === actingTeam ? actingJustPlayedIdx : gameState.teams[item.team].playerIndex;
            const anchorKey = `${item.team}:${playerIndex}`;
            const stackIndex = stackCounter.get(anchorKey) ?? 0;
            stackCounter.set(anchorKey, stackIndex + 1);

            addEmoticon(item.team, playerIndex, emoticonFile(item.animal, item.mood), stackIndex, emoticonCursor);
            emoticonCursor += 280;
          });
        }
      }

      prevScoresRef.current = afterScores;
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvents]);

  return {
    suppressedKeys,
    recentlyOpenedKeys,
    reactionMap,
    joltAllFaceDown,
    screenShakeLevel,
    leafParticleCount,
    floatingTexts,
    rabbitFlights,
    rabbitPressure,
    sheepCombos,
    mainCombo,
    tigerSlash,
    tigerRecoil,
    tigerImpact,
    mermaidEffect,
    mermaidPopup,
    boardBreathe,
    scoreFlash,
    collectGlowKeys,
    expandQuake,
    expandBurst,
    commentary,
    captions,
    emoticons,
    cardFocusBursts,
  };
}
