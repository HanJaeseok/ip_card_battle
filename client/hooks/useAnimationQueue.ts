'use client';

import { useEffect, useRef, useState } from 'react';
import type { Animal, ClientGameEvent, ClientGameState, Place, Team } from 'shared';
import { ANIMALS, THRESHOLDS } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';
import { playRandomSound, playRandomSoundSequence } from '@/lib/sounds';
import { SLOT_SPIN_DUR, SLOT_TOTAL_DUR, WOOL_BALL_DUR, SHEEP_DRAW_STEP } from '@/lib/drawTiming';

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
  team: Team | null; // null = 중립 (예: 카드 보충)
}

export interface RabbitFlight {
  id: number;
  team: Team;
  count: number; // 날아가는 토끼 아이콘 개수
}

export interface SheepCombo {
  id: number;
  place: Place; // 실용신양 효과로 카드가 뽑힌 장소
  combo: number; // 1부터 시작하는 콤보 번호
}

export interface MainCombo {
  id: number;
  combo: number; // 이번 연쇄의 최종 콤보 수
}

export interface SheepLoaded {
  id: number;
  team: Team;
  count: number; // 이번 액션에서 굴러갈 양(=추가로 뽑을 카드 수)
}

export interface RabbitPressure {
  sourceTeam: Team; // 토끼가 불어난 팀
  targetTeam: Team; // 압박을 느껴야 할 상대 팀
}

export interface CaptionItem {
  id: number;
  text: string;
  tier: 'pair' | 'effect'; // 페어 성사(카드 폭발 포함) / 효과 발동
  placeKey?: Place;
  stackAnimal?: Animal; // pair는 그 동물 스택 위에 앵커링
  team?: Team; // effect 자막 색상(우리팀 초록 / 상대팀 빨강 / 중립 금색) 판정용
}

export interface PlayerEmoticon {
  id: number;
  team: Team;
  playerIndex: number; // 팀 내 이 플레이어의 인덱스 (프로필 목록 앵커용)
  file: string;         // /emoticon/{file}.png
  stackIndex: number;   // 같은 앵커에 몇 번째로 겹쳐 쌓였는지 (크기/z-index 산출용)
}

export interface PlaceFocusItem {
  id: number;
  place: Place;
}

export interface DrawSlotItem {
  id: number;
  place: Place;
  animal: Animal;
  num: number;
}

export interface WoolBallItem {
  id: number;
  team: Team;
  place: Place;
}

export interface BombBurstItem {
  id: number;
  animal: Animal;
  cardNums: number[]; // 날아간 카드들의 숫자 (흔들리며 흘러내리는 카드 껍데기 연출용)
}

type EmoticonMood = 'happy' | 'burn' | 'cry' | 'stone';

function emoticonFile(animal: Animal, mood: EmoticonMood): string {
  return `${animal}_${mood}`;
}

function sumScores(scores: Record<Animal, number>): number {
  return scores.sheep + scores.rabbit + scores.mermaid + scores.tiger;
}

/** 특허랑이/디자인어에게 상대의 실용신양·상표토끼 중 어느 쪽이 더 많이 깎였는지 판정한다.
 *  둘 다 안 깎였으면 null, 동률이면 원래 점수가 더 낮아 비중이 더 컸던 쪽을 고른다. */
function biggerDropAnimal(
  before: Record<Animal, number>,
  after: Record<Animal, number>,
): 'sheep' | 'rabbit' | null {
  const sheepDrop = before.sheep - after.sheep;
  const rabbitDrop = before.rabbit - after.rabbit;
  if (sheepDrop <= 0 && rabbitDrop <= 0) return null;
  if (sheepDrop === rabbitDrop) return before.rabbit <= before.sheep ? 'rabbit' : 'sheep';
  return rabbitDrop > sheepDrop ? 'rabbit' : 'sheep';
}

interface EmoticonPlanItem {
  team: Team;
  animal: Animal;
  mood: EmoticonMood;
}

/**
 * 이번 액션(장소 클릭 1회 + 실용신양 연쇄 뽑기 포함)의 이벤트와 전/후 점수를 보고
 * "턴인 사람"과 "상대(피해자)" 이모티콘을 어떤 걸 띄울지 판정한다.
 *
 * 우선순위 규칙:
 * - 네 동물은 서로 배타적이지 않으므로(같은 액션에서 여러 동물이 동시에 관여 가능)
 *   해당하는 것을 전부 큐에 쌓는다 — 여러 개면 화면에서 겹쳐 쌓이며 표시된다.
 * - 단순히 카드 한 장만 뽑고 페어가 안 된 경우는 너무 사소해 이모티콘을 띄우지 않는다.
 */
function buildEmoticonPlan(
  events: ClientGameEvent[],
  before: Record<Team, Record<Animal, number>>,
  after: Record<Team, Record<Animal, number>>,
  actingTeam: Team,
): EmoticonPlanItem[] {
  const opp: Team = actingTeam === 'A' ? 'B' : 'A';
  const plan: EmoticonPlanItem[] = [];

  const drawnCount: Record<Animal, number> = { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 };
  const collectedAnimals = new Set<Animal>();
  events.forEach(ev => {
    if (ev.type === 'draw') drawnCount[ev.card.animal]++;
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
  const totalAfterAct = sumScores(after[actingTeam]);
  const totalAfterOpp = sumScores(after[opp]);
  const isAhead = totalAfterAct > totalAfterOpp;

  // ── 턴인 사람 ──────────────────────────────────────────────────────────
  if (rabbitBonus) {
    plan.push({ team: actingTeam, animal: 'rabbit', mood: isAhead ? 'happy' : 'burn' });
  }

  if (drawnCount.sheep >= 2 && !collectedAnimals.has('sheep')) {
    plan.push({ team: actingTeam, animal: 'sheep', mood: 'happy' });
  }

  // 효과가 실제로 발동했다면(내가 뒤지고 있어 효과 폭이 작더라도) 그냥 happy로
  // 통일한다 — "발동했는데 focus/burn이 뜨는" 게 오히려 헷갈린다는 피드백 반영.
  if (mermaidBonus || mermaidCatchup) {
    plan.push({ team: actingTeam, animal: 'mermaid', mood: 'happy' });
  }

  if (tigerAttack) {
    plan.push({ team: actingTeam, animal: 'tiger', mood: 'happy' });
  }

  // ── 상대(피해자) — 토끼/양 중 더 많이 깎인 쪽 하나만 보여준다 ──────────────
  if (tigerAttack) {
    const hurt = biggerDropAnimal(before[opp], after[opp]);
    if (hurt) plan.push({ team: opp, animal: hurt, mood: 'cry' });
  }
  if (mermaidCatchup) {
    const hurt = biggerDropAnimal(before[opp], after[opp]);
    if (hurt) plan.push({ team: opp, animal: hurt, mood: 'cry' });
  }

  return plan;
}

export interface AnimationState {
  screenShakeLevel: number; // 0 = none, 그 외엔 실용신양 콤보 번호(진동 강도 스케일 산출용)
  leafParticleCount: number;
  floatingTexts: FloatingTextItem[];
  rabbitFlights: RabbitFlight[];
  rabbitPressure: RabbitPressure | null;
  sheepCombos: SheepCombo[];
  mainCombo: MainCombo | null;
  sheepLoaded: SheepLoaded | null;
  tigerSlash: { onTeam: Team; dmg: number } | null;
  tigerRecoil: { attackerTeam: Team } | null;
  tigerImpact: boolean;
  mermaidEffect: { team: Team; type: 'catchup' | 'bonus' } | null;
  mermaidPopup: { team: Team } | null;
  scoreFlash: ReadonlyMap<string, number>; // "team:animal" → flash id (for CSS re-trigger)
  expandFlash: boolean;
  commentary: CommentaryLine[];
  captions: CaptionItem[];
  emoticons: PlayerEmoticon[];
  placeFocusBursts: PlaceFocusItem[];
  drawSlots: DrawSlotItem[];
  woolBalls: WoolBallItem[];
  bombBursts: BombBurstItem[];
  collectingCardIds: ReadonlySet<number>; // 수집되어 날아가는 중이라 아직 화면에 남겨야 하는 카드
  newCardId: number | null; // 방금 스택에 추가된 카드 (팝인 강조용)
  revealedCardIds: ReadonlySet<number>; // 슬롯머신 연출이 끝나 실제 스택에 그려도 되는 카드
  sheepReserve: Record<Team, number>;
  displayedActiveTeam: Team; // 정산 연출이 끝나야 실제 activeTeam으로 갱신되는 "화면상" 활성 팀
  displayedActivePlayerIndex: number;
  isSettling: boolean; // 이번 액션의 정산 연출이 아직 재생 중인지
}

const EMPTY_SCORE_MAP = new Map<string, number>() as ReadonlyMap<string, number>;
const EMPTY_ID_SET = new Set<number>() as ReadonlySet<number>;

const REACTION_DUR = 700;
const EMPTY_GAP = 80;
const SCORE_FLASH_DUR = 500;
const EFFECT_DUR = 1400;
const COMMENTARY_MAX = 40;
const TIGER_RECOIL_DUR = 500;
const TIGER_HIT_DUR = 900;
const MERMAID_POPUP_DUR = 2000;
const RABBIT_FLIGHT_DUR = 900;
const SHEEP_COMBO_DUR = 1400;
const SHAKE_PULSE_DUR = 300;
const MAIN_COMBO_DUR = 1300;
const RABBIT_PRESSURE_DUR = 700;
const COLLECT_FLING_DUR = 750; // .stack-card-fling-* CSS 지속시간과 일치해야 함
const BOMB_BURST_DUR = 850;
const SHEEP_LOADED_DUR = 1100;

let floatIdCounter = 0;

export function useAnimationQueue(
  lastEvents: ClientGameEvent[],
  gameState: ClientGameState | null,
): AnimationState {
  const [screenShakeLevel, setScreenShakeLevel] = useState(0);
  const [leafParticleCount, setLeafParticleCount] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [rabbitFlights, setRabbitFlights] = useState<RabbitFlight[]>([]);
  const [rabbitPressure, setRabbitPressure] = useState<RabbitPressure | null>(null);
  const [sheepCombos, setSheepCombos] = useState<SheepCombo[]>([]);
  const [mainCombo, setMainCombo] = useState<MainCombo | null>(null);
  const [sheepLoaded, setSheepLoaded] = useState<SheepLoaded | null>(null);
  const [tigerSlash, setTigerSlash] = useState<{ onTeam: Team; dmg: number } | null>(null);
  const [tigerRecoil, setTigerRecoil] = useState<{ attackerTeam: Team } | null>(null);
  const [tigerImpact, setTigerImpact] = useState(false);
  const [mermaidEffect, setMermaidEffect] = useState<{ team: Team; type: 'catchup' | 'bonus' } | null>(null);
  const [mermaidPopup, setMermaidPopup] = useState<{ team: Team } | null>(null);
  const [scoreFlash, setScoreFlash] = useState<ReadonlyMap<string, number>>(EMPTY_SCORE_MAP);
  const [expandFlash, setExpandFlash] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [emoticons, setEmoticons] = useState<PlayerEmoticon[]>([]);
  const [placeFocusBursts, setPlaceFocusBursts] = useState<PlaceFocusItem[]>([]);
  const [drawSlots, setDrawSlots] = useState<DrawSlotItem[]>([]);
  const [woolBalls, setWoolBalls] = useState<WoolBallItem[]>([]);
  const [bombBursts, setBombBursts] = useState<BombBurstItem[]>([]);
  const [collectingCardIds, setCollectingCardIds] = useState<ReadonlySet<number>>(EMPTY_ID_SET);
  const [newCardId, setNewCardId] = useState<number | null>(null);
  const [revealedCardIds, setRevealedCardIds] = useState<ReadonlySet<number>>(EMPTY_ID_SET);
  const [sheepReserve, setSheepReserve] = useState<Record<Team, number>>({ A: 0, B: 0 });

  // 실제 서버 상태(gameState.activeTeam)는 액션 처리 즉시 다음 팀으로 넘어가지만,
  // 화면에는 이번 액션의 정산 연출이 완전히 끝날 때까지 "행동한 팀"을 그대로 유지해
  // 보여준다 — 정산 도중 배경/테두리 색이 성급하게 바뀌어 혼란을 주지 않기 위함.
  const [displayedActiveTeam, setDisplayedActiveTeam] = useState<Team>(gameState?.activeTeam ?? 'A');
  const [displayedActivePlayerIndex, setDisplayedActivePlayerIndex] = useState<number>(gameState?.activePlayerIndex ?? 0);
  const [isSettling, setIsSettling] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 다음 액션이 들어올 때 timersRef를 통째로 비우기 때문에, 그보다 오래 지속되는
  // 이모티콘 등의 "제거" 타이머는 여기 따로 담아 언마운트 시에만 정리한다.
  const persistentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => persistentTimersRef.current.forEach(clearTimeout), []);

  // 직전 액션 종료 시점의 팀별 점수 스냅샷 — 이번 액션의 전/후 비교(실용신양 보유량
  // 게이지, 이모티콘 판정)에 쓴다.
  const prevScoresRef = useRef<Record<Team, Record<Animal, number>> | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // lastEvents가 비어있는 gameState 갱신(최초 입장 · 재접속 스냅샷)은 재생할 애니메이션이
  // 없으므로, 이미 존재하는 카드들을 슬롯머신 연출 없이 즉시 스택에 그대로 노출시킨다.
  // (actionResult로 들어오는 갱신은 항상 최소 1개 이상의 이벤트를 동반하므로 여기 걸리지 않는다.)
  useEffect(() => {
    if (!gameState || lastEvents.length > 0) return;
    setRevealedCardIds(prev => {
      let changed = false;
      const next = new Set(prev);
      ANIMALS.forEach(a => {
        gameState.stacks[a].forEach(c => {
          if (!next.has(c.id)) {
            next.add(c.id);
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
    // 재생할 정산 애니메이션이 없는 갱신이므로 곧바로 실제 턴 상태와 동기화한다.
    setDisplayedActiveTeam(gameState.activeTeam);
    setDisplayedActivePlayerIndex(gameState.activePlayerIndex);
    setIsSettling(false);
  }, [gameState, lastEvents]);

  const sched = (fn: () => void, delayMs: number) => {
    const t = setTimeout(fn, delayMs);
    timersRef.current.push(t);
  };

  const schedPersistent = (fn: () => void, delayMs: number) => {
    const t = setTimeout(fn, delayMs);
    persistentTimersRef.current.push(t);
  };

  const addFloat = (text: string, team: Team, type: 'bonus' | 'penalty') => {
    const id = ++floatIdCounter;
    setFloatingTexts(prev => [...prev, { id, text, team, type }]);
    sched(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1200);
  };

  const CAPTION_DUR: Record<CaptionItem['tier'], number> = { pair: 800, effect: 950 };
  const addCaption = (
    text: string,
    tier: CaptionItem['tier'],
    atMs: number,
    opts?: { placeKey?: Place; stackAnimal?: Animal; team?: Team },
  ) => {
    const id = ++floatIdCounter;
    sched(() => {
      setCaptions(prev => [...prev, { id, text, tier, ...opts }]);
      sched(() => setCaptions(prev => prev.filter(c => c.id !== id)), CAPTION_DUR[tier]);
    }, atMs);
  };

  const EMOTICON_DUR = 2000;
  const addEmoticon = (team: Team, playerIndex: number, file: string, stackIndex: number, atMs: number) => {
    const id = ++floatIdCounter;
    sched(() => {
      setEmoticons(prev => [...prev, { id, team, playerIndex, file, stackIndex }]);
      schedPersistent(() => setEmoticons(prev => prev.filter(e => e.id !== id)), EMOTICON_DUR);
    }, atMs);
  };

  const PLACE_FOCUS_DUR = 480;
  const addPlaceFocus = (place: Place, atMs: number) => {
    const id = ++floatIdCounter;
    sched(() => {
      setPlaceFocusBursts(prev => [...prev, { id, place }]);
      schedPersistent(() => setPlaceFocusBursts(prev => prev.filter(f => f.id !== id)), PLACE_FOCUS_DUR);
    }, atMs);
  };

  useEffect(() => {
    if (lastEvents.length === 0) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // ── 이전 액션이 "켜놓고 나중에 끄기"로 예약해둔 연출들을 강제로 정리한다 ──
    // 위에서 timersRef를 통째로 취소했기 때문에, 이전 액션이 예약해둔 "일정 시간
    // 후 끄기/제거" 콜백들도 함께 사라진다. 새 액션이 도착했다는 것 자체가 서버
    // 기준으로는 이전 액션이 이미 완전히 끝났다는 뜻이므로(특히 빠르게 다음 수를
    // 두는 컴퓨터 상대), 켜진 채로 방치되면 화면에 영원히 남는 연출들을 여기서
    // 전부 끈다. 반대로 emoticons/placeFocusBursts/sheepLoaded는 schedPersistent로
    // 이미 timersRef 취소의 영향을 받지 않도록 설계되어 있으므로 건드리지 않는다.
    setScreenShakeLevel(0);
    setLeafParticleCount(0);
    setFloatingTexts([]);
    setRabbitFlights([]);
    setRabbitPressure(null);
    setSheepCombos([]);
    setMainCombo(null);
    setTigerSlash(null);
    setTigerRecoil(null);
    setTigerImpact(false);
    setMermaidEffect(null);
    setMermaidPopup(null);
    setScoreFlash(EMPTY_SCORE_MAP);
    setExpandFlash(false);
    setCaptions([]);
    setDrawSlots([]);
    setWoolBalls([]);
    setBombBursts([]);
    setCollectingCardIds(EMPTY_ID_SET);
    setNewCardId(null);

    // 이번 액션의 정산 연출이 끝날 때까지는 화면상 "행동한 팀"의 턴으로 유지한다.
    setIsSettling(true);

    const gameState = gameStateRef.current;
    const beforeScores = prevScoresRef.current;

    // ── 이전 액션에서 아직 "등장" 애니메이션이 끝나지 않은 채로 남아있던 카드를
    // 여기서 즉시 노출시킨다. 위에서 방금 이전 타이머를 전부 취소했기 때문에,
    // 만약 이전 액션의 뽑기 애니메이션(특히 긴 실용신양 연쇄)이 채 끝나기도 전에
    // 이번 액션(다음 팀의 차례, 특히 빠르게 두는 컴퓨터 상대)이 도착하면 그 카드들의
    // "등장" 예약이 취소되어 영원히 투명한 채로 남는 버그가 있었다 — 이번 액션 자신이
    // 새로 뽑은 카드만 제외하고, 나머지는 지금 화면에 즉시 반영한다.
    if (gameState) {
      const thisActionCardIds = new Set(
        lastEvents.filter((e): e is Extract<ClientGameEvent, { type: 'draw' }> => e.type === 'draw')
          .map(e => e.card.id),
      );
      setRevealedCardIds(prev => {
        let changed = false;
        const next = new Set(prev);
        ANIMALS.forEach(a => {
          gameState.stacks[a].forEach(c => {
            if (c.collectedBy === null && !next.has(c.id) && !thisActionCardIds.has(c.id)) {
              next.add(c.id);
              changed = true;
            }
          });
        });
        return changed ? next : prev;
      });
    }

    // ── Pass 0: 해설판 커멘터리 생성 (즉시 반영, 통합 로그) ─────────────────
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
        } else if (ev.type === 'sheepRoll') {
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} 추가 카드 ${ev.count}장 뽑기!`,
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
          newLines.push({ team: null, text: '카드 재고가 보충되었습니다!' });
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

    // ── Pass 1: 뽑기(draw) + 실용신양 연쇄(sheepRoll) 애니메이션 ────────────
    let cursor = 0;
    let sheepRollTeam: Team | null = null;
    let sheepRollRemaining = 0;
    let sheepRollIdx = 0;
    let comboCounter = 0;
    let sheepReserveInited = false;
    let lastDrawEndCursor = 0;

    for (const ev of lastEvents) {
      if (ev.type === 'draw') {
        const inRoll = sheepRollRemaining > 0;
        const triggerAt = cursor;

        if (inRoll) {
          sheepRollRemaining--;
          sheepRollIdx++;
          const team = sheepRollTeam!;
          const place = ev.place;
          const ballId = ++floatIdCounter;
          sched(() => {
            setWoolBalls(prev => [...prev, { id: ballId, team, place }]);
            sched(() => setWoolBalls(prev => prev.filter(b => b.id !== ballId)), WOOL_BALL_DUR);
          }, triggerAt);
        }

        const slotAt = inRoll ? triggerAt + WOOL_BALL_DUR : triggerAt;
        const revealAt = slotAt + SLOT_SPIN_DUR;
        const drawEndsAt = slotAt + SLOT_TOTAL_DUR;
        const card = ev.card;
        const place = ev.place;

        const slotId = ++floatIdCounter;
        sched(() => {
          setDrawSlots(prev => [...prev, { id: slotId, place, animal: card.animal, num: card.num }]);
          sched(() => setDrawSlots(prev => prev.filter(s => s.id !== slotId)), SLOT_TOTAL_DUR);
        }, slotAt);

        addPlaceFocus(place, slotAt);

        const pitch = inRoll ? Math.min(1.35, 1 + (sheepRollIdx - 1) * 0.035) : 1;
        sched(() => playRandomSound('card', pitch), revealAt);

        sched(() => {
          setNewCardId(card.id);
          setRevealedCardIds(prev => (prev.has(card.id) ? prev : new Set(prev).add(card.id)));
          sched(() => setNewCardId(prev => (prev === card.id ? null : prev)), REACTION_DUR);
        }, drawEndsAt - 120);

        if (inRoll) {
          const combo = ++comboCounter;
          const comboId = ++floatIdCounter;
          const team = sheepRollTeam!;
          sched(() => {
            setSheepCombos(prev => [...prev, { id: comboId, place, combo }]);
            sched(() => setSheepCombos(prev => prev.filter(c => c.id !== comboId)), SHEEP_COMBO_DUR);

            // 콤보마다 진동 — 1콤보는 약하게 시작해 콤보가 쌓일수록 점점 강해진다
            setScreenShakeLevel(combo);
            sched(() => setScreenShakeLevel(0), SHAKE_PULSE_DUR);

            // 실용신양 보유량 게이지에서 양 한 마리가 "뿅" 사라진다
            setSheepReserve(prev => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }));
          }, revealAt);

          if (sheepRollRemaining === 0) {
            const finalId = ++floatIdCounter;
            sched(() => {
              setMainCombo({ id: finalId, combo });
              sched(() => setMainCombo(null), MAIN_COMBO_DUR);
            }, revealAt);
          }
        }

        lastDrawEndCursor = Math.max(lastDrawEndCursor, drawEndsAt);
        cursor = inRoll ? triggerAt + SHEEP_DRAW_STEP : drawEndsAt + EMPTY_GAP;
        continue;
      }

      if (ev.type === 'bomb') {
        const inRoll = sheepRollRemaining > 0;
        const triggerAt = cursor;

        if (inRoll) {
          sheepRollRemaining--;
          sheepRollIdx++;
          const team = sheepRollTeam!;
          const place = ev.place;
          const ballId = ++floatIdCounter;
          sched(() => {
            setWoolBalls(prev => [...prev, { id: ballId, team, place }]);
            sched(() => setWoolBalls(prev => prev.filter(b => b.id !== ballId)), WOOL_BALL_DUR);
          }, triggerAt);
        }

        const revealAt = inRoll ? triggerAt + WOOL_BALL_DUR : triggerAt;
        const drawEndsAt = revealAt + BOMB_BURST_DUR;
        const place = ev.place;
        const animal = ev.animal;
        const burstId = ++floatIdCounter;

        addPlaceFocus(place, revealAt);
        addCaption(`🌰 ${ANIMAL_INFO[animal].short} 카드 전부 폭발!`, 'pair', revealAt, { stackAnimal: animal });

        sched(() => {
          setBombBursts(prev => [...prev, { id: burstId, animal, cardNums: ev.clearedCards.map(c => c.num) }]);
          playRandomSound('tiger'); // 도토리 폭탄 전용 효과음 자원이 없어 가장 타격감 있는 사운드로 대체
          setScreenShakeLevel(prevLvl => Math.max(prevLvl, 2));
          sched(() => setScreenShakeLevel(0), SHAKE_PULSE_DUR);
          sched(() => setBombBursts(prev => prev.filter(b => b.id !== burstId)), BOMB_BURST_DUR);
        }, revealAt);

        lastDrawEndCursor = Math.max(lastDrawEndCursor, drawEndsAt);
        cursor = inRoll ? triggerAt + SHEEP_DRAW_STEP : drawEndsAt + EMPTY_GAP;
        continue;
      }

      if (ev.type === 'sheepRoll') {
        sheepRollTeam = ev.team;
        sheepRollRemaining = ev.count;
        sheepRollIdx = 0;

        // 이번 액션 시작 시점의 보유량으로 게이지를 리셋 — 우리 턴이 시작되는
        // 순간 양이 다시 꽉 찬 채로 보였다가, 뽑을 때마다 하나씩 사라지게 한다.
        if (!sheepReserveInited && beforeScores) {
          sheepReserveInited = true;
          const fullCount = Math.floor(beforeScores[ev.team].sheep / THRESHOLDS.sheep);
          setSheepReserve(prev => ({ ...prev, [ev.team]: fullCount }));
        }

        if (ev.count >= 5) {
          const level = ev.count;
          sched(() => {
            setLeafParticleCount(level >= 12 ? 8 : 4);
            sched(() => setLeafParticleCount(0), 3000);
          }, cursor);
        }

        // "N마리 장전!" — 실용신양 효과가 이번 액션에서 몇 번 더 굴러갈지 큼직하게 예고한다.
        {
          const loadedId = ++floatIdCounter;
          const team = ev.team;
          const count = ev.count;
          sched(() => {
            setSheepLoaded({ id: loadedId, team, count });
            schedPersistent(() => {
              setSheepLoaded(prev => (prev?.id === loadedId ? null : prev));
            }, SHEEP_LOADED_DUR);
          }, cursor);
        }
        continue;
      }
    }

    // ── Pass 1.5: 정산 이벤트를 동물별로 그룹화해 재생 ──────────────────────
    // 서버는 sheep→rabbit→mermaid→tiger 순으로 정산하고 상표토끼 턴종료 훅은
    // 이벤트 배열 맨 끝에 붙지만, 화면에는 항상 양→토끼→호랑이→인어 순으로
    // 보여주고 각 정산 사이에 2초 텀을 둔다. 이번 라운드에 발동 조건을
    // 충족하지 못한 동물은 완전히 건너뛴다(텀도 없음).
    {
      type SettleEvent = Extract<
        ClientGameEvent,
        { type: 'collect' | 'tigerAttack' | 'mermaidCatchup' | 'mermaidBonus' | 'rabbitBonus' }
      >;

      const settleEvents = lastEvents.filter(
        (e): e is SettleEvent =>
          e.type === 'collect' ||
          e.type === 'tigerAttack' ||
          e.type === 'mermaidCatchup' ||
          e.type === 'mermaidBonus' ||
          e.type === 'rabbitBonus',
      );

      const SETTLE_ORDER: Animal[] = ['sheep', 'rabbit', 'tiger', 'mermaid'];
      // 이전 동물의 정산 애니메이션/사운드가 끝난 직후 바로 이어지도록 짧은
      // 여백만 두고, 굳이 긴 텀을 강제로 넣지 않는다(각 그룹 내부 처리 로직이
      // 이미 그 동물의 이펙트 재생 시간만큼 커서를 정확히 밀어준다).
      const SETTLE_GAP = 150;

      const groups = SETTLE_ORDER.map(animal => ({
        animal,
        events: settleEvents.filter(e => {
          if (e.type === 'collect') return e.animal === animal;
          if (e.type === 'rabbitBonus') return animal === 'rabbit';
          if (e.type === 'tigerAttack') return animal === 'tiger';
          return animal === 'mermaid'; // mermaidBonus / mermaidCatchup
        }),
      }));

      // 아직 재생 중인 마지막 뽑기 애니메이션과 겹치지 않도록 커서를 그 뽑기가
      // 끝나는 시점 이후로 밀어준다.
      cursor = Math.max(cursor, lastDrawEndCursor + EMPTY_GAP);
      let hasPlayedGroup = false;

      for (const group of groups) {
        if (group.events.length === 0) continue;
        if (hasPlayedGroup) cursor += SETTLE_GAP;
        hasPlayedGroup = true;

        for (const ev of group.events) {
          if (ev.type === 'collect') {
            const { team, animal, cardIds } = ev;
            const flashKey = `${team}:${animal}`;
            const flashId = ++floatIdCounter;
            const at = cursor;

            addCaption(`${ANIMAL_INFO[animal].short} 페어!`, 'pair', at, { stackAnimal: animal });

            sched(() => {
              setCollectingCardIds(prev => new Set([...prev, ...cardIds]));
              setScoreFlash(prev => new Map([...prev, [flashKey, flashId]]));
              sched(() => {
                setScoreFlash(prev => {
                  const next = new Map(prev);
                  if (next.get(flashKey) === flashId) next.delete(flashKey);
                  return next;
                });
              }, SCORE_FLASH_DUR);
            }, at);

            sched(() => {
              setCollectingCardIds(prev => {
                const next = new Set(prev);
                cardIds.forEach(id => next.delete(id));
                return next;
              });
            }, at + COLLECT_FLING_DUR);

            cursor = at + COLLECT_FLING_DUR + 80;

          } else if (ev.type === 'tigerAttack') {
            const onTeam: Team = ev.team === 'A' ? 'B' : 'A';
            const at = cursor;

            addCaption('특허랑이 발동!', 'effect', at + 150, { team: ev.team });

            sched(() => {
              setTigerRecoil({ attackerTeam: ev.team });
              sched(() => setTigerRecoil(null), TIGER_RECOIL_DUR);
            }, at);
            sched(() => {
              setTigerSlash({ onTeam, dmg: ev.dmg });
              setTigerImpact(true);
              playRandomSound('tiger');
              sched(() => setTigerSlash(null), TIGER_HIT_DUR);
              sched(() => setTigerImpact(false), 600);
            }, at + 150);

            cursor = at + 150 + TIGER_HIT_DUR + 80;

          } else if (ev.type === 'mermaidCatchup') {
            const at = cursor;
            addCaption('디자인어 발동!', 'effect', at, { team: ev.team });
            sched(() => {
              setMermaidEffect({ team: ev.team, type: 'catchup' });
              setMermaidPopup({ team: ev.team });
              playRandomSound('mermaid');
              addFloat(`+${ev.absorb}`, ev.team, 'bonus');
              addFloat(`-${ev.absorb}`, ev.team === 'A' ? 'B' : 'A', 'penalty');
              sched(() => setMermaidEffect(null), EFFECT_DUR);
              sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
            }, at);
            cursor = at + EFFECT_DUR;

          } else if (ev.type === 'mermaidBonus') {
            const at = cursor;
            addCaption('디자인어 발동!', 'effect', at, { team: ev.team });
            sched(() => {
              setMermaidEffect({ team: ev.team, type: 'bonus' });
              setMermaidPopup({ team: ev.team });
              playRandomSound('mermaid');
              addFloat(`+${ev.bonus}`, ev.team, 'bonus');
              sched(() => setMermaidEffect(null), EFFECT_DUR);
              sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
            }, at);
            cursor = at + EFFECT_DUR;

          } else if (ev.type === 'rabbitBonus') {
            const team = ev.team;
            const at = cursor;

            addCaption('상표토끼 발동!', 'effect', at, { team });

            sched(() => {
              const digits = String(Math.max(1, ev.bonus)).length;
              playRandomSoundSequence('rabbit', digits);

              const flightId = ++floatIdCounter;
              setRabbitFlights(prev => [...prev, { id: flightId, team, count: digits }]);
              sched(() => {
                setRabbitFlights(prev => prev.filter(f => f.id !== flightId));
              }, RABBIT_FLIGHT_DUR);

              addFloat(`+${ev.bonus}`, team, 'bonus');

              const targetTeam: Team = team === 'A' ? 'B' : 'A';
              setRabbitPressure({ sourceTeam: team, targetTeam });
              setScreenShakeLevel(prev => Math.max(prev, Math.min(2, 0.6 + ev.bonus / 25)));
              sched(() => {
                setRabbitPressure(null);
                setScreenShakeLevel(0);
              }, RABBIT_PRESSURE_DUR);
            }, at);

            cursor = at + RABBIT_FLIGHT_DUR + 80;
          }
        }
      }

      // expand는 정산과 무관한 턴 전환 이벤트라 그룹 재생이 모두 끝난 뒤에 이어 재생한다.
      const expandEv = lastEvents.find(e => e.type === 'expand');
      if (expandEv) {
        const at = cursor;
        addCaption('더 신나게!!', 'effect', at);
        sched(() => {
          setExpandFlash(true);
          sched(() => setExpandFlash(false), 600);
        }, at);
        cursor = at + 700;

        // 이 시점부터 도토리 폭탄이 등장하기 시작하며, 턴이 오를수록 확률이 오른다는 것을 1회 안내한다.
        addCaption('🌰 도토리 폭탄 등장! 턴마다 확률 UP', 'effect', cursor);
        cursor += 950;
      }

      // 정산 연출이 여기서 끝난다 — 이 시점에야 비로소 화면상의 턴을 실제 서버 상태로 넘긴다.
      sched(() => {
        setIsSettling(false);
        const latest = gameStateRef.current;
        if (latest) {
          setDisplayedActiveTeam(latest.activeTeam);
          setDisplayedActivePlayerIndex(latest.activePlayerIndex);
        }
      }, cursor);
    }

    // ── Pass 2: 플레이어 이모티콘 판정 (턴인 사람 / 상대) ───────────────────
    // 게임이 끝나는 액션은 턴 로테이션이 갱신되지 않아 앵커 역산이 어긋날 수 있으므로 건너뛴다.
    if (gameState && gameState.phase !== 'ended') {
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
          const actingMembers = gameState.teams[actingTeam].members.length;
          const actingJustPlayedIdx =
            (gameState.teams[actingTeam].playerIndex - 1 + actingMembers) % actingMembers;

          const stackCounter = new Map<string, number>();
          let emoticonCursor = cursor + 200;
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

  // 게임이 끝나면 아직 재생 대기 중인 예약된 효과음/애니메이션을 전부 취소한다.
  // 취소된 타이머 중엔 정산 종료를 알리는 턴 전환 콜백도 포함되므로, isSettling이
  // 영원히 true로 멈춰있지 않도록 여기서 직접 정리해준다.
  useEffect(() => {
    if (gameState?.phase === 'ended') {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      persistentTimersRef.current.forEach(clearTimeout);
      persistentTimersRef.current = [];
      setIsSettling(false);
    }
  }, [gameState?.phase]);

  return {
    screenShakeLevel,
    leafParticleCount,
    floatingTexts,
    rabbitFlights,
    rabbitPressure,
    sheepCombos,
    mainCombo,
    sheepLoaded,
    tigerSlash,
    tigerRecoil,
    tigerImpact,
    mermaidEffect,
    mermaidPopup,
    scoreFlash,
    expandFlash,
    commentary,
    captions,
    emoticons,
    placeFocusBursts,
    drawSlots,
    woolBalls,
    bombBursts,
    collectingCardIds,
    newCardId,
    revealedCardIds,
    displayedActiveTeam,
    displayedActivePlayerIndex,
    isSettling,
    sheepReserve,
  };
}
