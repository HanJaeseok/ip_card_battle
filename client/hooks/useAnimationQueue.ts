'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Animal, ClientGameEvent, ClientGameState, Place, StackedCard, Team } from 'shared';
import { ANIMALS } from 'shared';
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
  team: Team | null; // null = 중립 (예: 턴 전환)
}

export interface SheepCombo {
  id: number;
  place: Place; // 예약된 추가 뽑기로 카드가 뽑힌 장소
  combo: number; // 1부터 시작하는 콤보 번호
}

export interface MainCombo {
  id: number;
  combo: number; // 이번 연쇄의 최종 콤보 수
}

export interface SheepLoaded {
  id: number;
  team: Team;
  count: number; // 이번 액션에서 소모되는 예약된 추가 뽑기 수
}

export interface SheepProgress {
  team: Team;
  current: number; // 지금까지 소모한 예약 뽑기 수
  total: number;   // 이번에 소모해야 할 전체 예약 뽑기 수
}

export interface RabbitFlight {
  id: number;
  team: Team;
  count: number; // 날아가는 토끼 아이콘 개수(획득 점수 자릿수)
}

export interface RabbitPressure {
  sourceTeam: Team; // 토끼가 불어난 팀
  targetTeam: Team; // 압박을 느껴야 할 상대 팀
}

export interface CaptionItem {
  id: number;
  text: string;
  tier: 'pair' | 'effect'; // 페어 성사(카드 폭발 포함) / 스킬 발동
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
  animal: Animal; // 도토리 폭죽이 터질 위치(그 동물 스택) — 실제 카드는 스택에서 직접 흔들리다 사라진다
}

export interface ShakingPile {
  id: number;
  animal: Animal; // 짝이 맞아 정산되기 직전, 그 동물 스택 전체가 "확인하듯" 흔들리는 연출
}

function emoticonFile(animal: Animal, mood: 'happy' | 'cry'): string {
  return `${animal}_${mood}`;
}

export interface AnimationState {
  screenShakeLevel: number; // 0 = none
  leafParticleCount: number;
  floatingTexts: FloatingTextItem[];
  sheepCombos: SheepCombo[];
  mainCombo: MainCombo | null;
  sheepLoaded: SheepLoaded | null;
  sheepProgress: SheepProgress | null; // 예약된 추가 뽑기가 지금 몇 번째까지 소모됐는지
  rabbitFlights: RabbitFlight[];
  rabbitPressure: RabbitPressure | null;
  tigerSlash: { onTeam: Team } | null;
  tigerRecoil: { attackerTeam: Team } | null;
  tigerImpact: boolean;
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
  bombFallingIds: ReadonlySet<number>; // 도토리 폭탄으로 흔들리며 떨어지는 중인 카드
  shakingPile: ShakingPile | null; // 정산 직전 "확인" 흔들림이 재생 중인 동물 스택
  newCardId: number | null; // 방금 스택에 추가된 카드 (팝인 강조용)
  stackCards: Record<Animal, StackedCard[]>; // 화면에 실제로 그려야 하는 카드 목록(연출 타이밍 반영, id 오름차순)
  displayedActiveTeam: Team; // 정산 연출이 끝나야 실제 activeTeam으로 갱신되는 "화면상" 활성 팀
  displayedActivePlayerIndex: number;
  isSettling: boolean; // 이번 액션의 정산 연출이 아직 재생 중인지
}

// 수동으로 "다음 기회를 노리기"를 골랐을 때 화면에 뜨는 문구 — 매번 무작위로 하나 고른다.
const PASS_CAPTIONS = ['다음 기회를 노려봅니다.', '큰그림 그리는 중..', '(레벨 올려서 한 번에 몰아칠 예정)'];

const EMPTY_SCORE_MAP = new Map<string, number>() as ReadonlyMap<string, number>;
const EMPTY_ID_SET = new Set<number>() as ReadonlySet<number>;

const EMPTY_GAP = 80;
const SCORE_FLASH_DUR = 500;
const EFFECT_DUR = 1200;
const COMMENTARY_MAX = 40;
const SHEEP_COMBO_DUR = 1400;
const SHAKE_PULSE_DUR = 300;
const MAIN_COMBO_DUR = 1300;
const REACTION_DUR = 700;
const COLLECT_FLING_DUR = 750; // .stack-card-fling-* CSS 지속시간과 일치해야 함
const BOMB_FALL_DUR = 800; // .stack-card-bomb-fall CSS 지속시간과 일치해야 함
const SHAKE_CHECK_DUR = 550; // .stack-card-shake-* CSS 지속시간과 일치해야 함
const SHEEP_LOADED_DUR = 1100;
const EMOTICON_DUR = 2000;
const TIGER_RECOIL_DUR = 500;
const TIGER_HIT_DUR = 900;
const MERMAID_POPUP_DUR = 2000;
const RABBIT_FLIGHT_DUR = 900;
const RABBIT_PRESSURE_DUR = 700;

let floatIdCounter = 0;

export function useAnimationQueue(
  lastEvents: ClientGameEvent[],
  gameState: ClientGameState | null,
): AnimationState {
  const [screenShakeLevel, setScreenShakeLevel] = useState(0);
  const [leafParticleCount, setLeafParticleCount] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [sheepCombos, setSheepCombos] = useState<SheepCombo[]>([]);
  const [mainCombo, setMainCombo] = useState<MainCombo | null>(null);
  const [sheepLoaded, setSheepLoaded] = useState<SheepLoaded | null>(null);
  const [sheepProgress, setSheepProgress] = useState<SheepProgress | null>(null);
  const [rabbitFlights, setRabbitFlights] = useState<RabbitFlight[]>([]);
  const [rabbitPressure, setRabbitPressure] = useState<RabbitPressure | null>(null);
  const [tigerSlash, setTigerSlash] = useState<{ onTeam: Team } | null>(null);
  const [tigerRecoil, setTigerRecoil] = useState<{ attackerTeam: Team } | null>(null);
  const [tigerImpact, setTigerImpact] = useState(false);
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
  const [bombFallingIds, setBombFallingIds] = useState<ReadonlySet<number>>(EMPTY_ID_SET);
  const [shakingPile, setShakingPile] = useState<ShakingPile | null>(null);
  const [newCardId, setNewCardId] = useState<number | null>(null);
  // "화면에 지금 그려야 하는 카드"를 실제 서버 진실(gameState.stacks)과 분리해서 관리한다.
  // 서버는 액션이 끝나는 즉시 최종 상태(수집/폭탄으로 카드가 사라진 상태)를 보내오지만,
  // 화면에는 "등장 → (짝 맞으면) 흔들기 → 날아가기" 또는 "(폭탄이면) 흔들며 떨어지기"
  // 연출이 끝난 뒤에야 사라지도록, id를 여기서 직접 관리한다.
  const [revealedCardIds, setRevealedCardIds] = useState<ReadonlySet<number>>(EMPTY_ID_SET);
  // 카드 원본 데이터 캐시 — 폭탄으로 서버 배열에서 완전히 사라진 카드도 떨어지는
  // 연출이 끝날 때까지는 계속 그려야 하므로, 사라지기 전 마지막 모습을 여기 보관한다.
  const cardCacheRef = useRef<Map<number, StackedCard>>(new Map());

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

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // lastEvents가 비어있는 gameState 갱신(최초 입장 · 재접속 스냅샷)은 재생할 애니메이션이
  // 없으므로, 이미 존재하는 카드들을 슬롯머신 연출 없이 즉시 스택에 그대로 노출시킨다.
  // (actionResult로 들어오는 갱신은 항상 최소 1개 이상의 이벤트를 동반하므로 여기 걸리지 않는다.)
  useEffect(() => {
    if (!gameState || lastEvents.length > 0) return;
    ANIMALS.forEach(a => {
      gameState.stacks[a].forEach(c => cardCacheRef.current.set(c.id, c));
    });
    setRevealedCardIds(prev => {
      let changed = false;
      const next = new Set(prev);
      ANIMALS.forEach(a => {
        gameState.stacks[a].forEach(c => {
          // 이미 수집이 끝난(획득 기록으로만 남은) 카드는 다시 노출시키지 않는다.
          if (c.collectedBy === null && !next.has(c.id)) {
            next.add(c.id);
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
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
    setSheepCombos([]);
    setMainCombo(null);
    setSheepProgress(null);
    setRabbitFlights([]);
    setRabbitPressure(null);
    setTigerSlash(null);
    setTigerRecoil(null);
    setTigerImpact(false);
    setMermaidPopup(null);
    setScoreFlash(EMPTY_SCORE_MAP);
    setExpandFlash(false);
    setCaptions([]);
    setDrawSlots([]);
    setWoolBalls([]);
    setBombBursts([]);
    setShakingPile(null);
    setNewCardId(null);

    // 이번 액션의 정산 연출이 끝날 때까지는 화면상 "행동한 팀"의 턴으로 유지한다.
    setIsSettling(true);

    const gameState = gameStateRef.current;

    // ── 카드 원본 캐시 갱신 + 정산/취소 잔재 정리 ───────────────────────────
    // 서버는 액션이 끝나는 즉시 최종 상태(수집·폭탄으로 카드가 사라진 상태)를
    // 보내오지만, 화면에는 "등장 → 흔들기 → 날아가기/떨어지기" 연출이 끝난
    // 뒤에야 반영되어야 한다. 그런데 바로 위에서 이전 액션의 타이머를 전부
    // 취소했기 때문에, 이전 액션의 연출이 채 끝나기 전에 새 액션이 도착하면
    // 두 방향의 문제가 생길 수 있었다: (1) 아직 등장 못한 카드가 영원히 투명한
    // 채로 남거나, (2) 이미 수집/폭탄으로 사라졌어야 할 카드가 날아가기 연출이
        // 취소된 채 정지 화면으로 계속 남는 것. 여기서 캐시를 최신화하고 두 경우를
    // 모두 즉시 바로잡은 뒤 이번 액션을 시작한다.
    if (gameState) {
      ANIMALS.forEach(a => {
        gameState.stacks[a].forEach(c => cardCacheRef.current.set(c.id, c));
      });

      const thisActionDrawIds = new Set(
        lastEvents.filter((e): e is Extract<ClientGameEvent, { type: 'draw' }> => e.type === 'draw')
          .map(e => e.card.id),
      );
      const thisActionCollectIds = new Set(
        lastEvents
          .filter((e): e is Extract<ClientGameEvent, { type: 'collect' }> => e.type === 'collect')
          .flatMap(e => e.cardIds),
      );
      const thisActionBombIds = new Set(
        lastEvents
          .filter((e): e is Extract<ClientGameEvent, { type: 'bomb' }> => e.type === 'bomb')
          .flatMap(e => e.clearedCards.map(c => c.id)),
      );

      setRevealedCardIds(prev => {
        let changed = false;
        const next = new Set(prev);

        // (1) 아직 못 보여준 채로 남아있던 미획득 카드를 즉시 노출한다.
        ANIMALS.forEach(a => {
          gameState.stacks[a].forEach(c => {
            if (c.collectedBy === null && !next.has(c.id) && !thisActionDrawIds.has(c.id)) {
              next.add(c.id);
              changed = true;
            }
          });
        });

        // (2) 이미 수집/폭탄으로 사라졌어야 하는데 취소되어 계속 보이던 카드를 즉시 치운다.
        next.forEach(id => {
          if (thisActionDrawIds.has(id) || thisActionCollectIds.has(id) || thisActionBombIds.has(id)) return;
          const cached = cardCacheRef.current.get(id);
          if (!cached) return;
          const stillOnBoard = gameState.stacks[cached.animal].some(c => c.id === id);
          if (cached.collectedBy !== null || !stillOnBoard) {
            next.delete(id);
            changed = true;
          }
        });

        return changed ? next : prev;
      });

      setCollectingCardIds(prev => (prev.size === 0 ? prev : EMPTY_ID_SET));
      setBombFallingIds(prev => (prev.size === 0 ? prev : EMPTY_ID_SET));
    }

    // ── Pass 0: 해설판 커멘터리 생성 (즉시 반영, 통합 로그) ─────────────────
    if (gameState) {
      type Slot = { id: string; key: DeltaKey; delta: number };
      const slots: Slot[] = [];

      lastEvents.forEach((ev, i) => {
        if (ev.type === 'collect') {
          slots.push({ id: `${i}:main`, key: deltaKeyOf(ev.team, ev.animal), delta: ev.score });
        } else if (ev.type === 'skillApplied' && ev.myScoreDelta > 0 && ev.animal !== 'sheep') {
          slots.push({ id: `${i}:main`, key: deltaKeyOf(ev.team, ev.animal), delta: ev.myScoreDelta });
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
        } else if (ev.type === 'bonusDraws') {
          newLines.push({
            team: ev.team,
            text: `${teamLabel(ev.team)} 예약된 카드 ${ev.count}장 뽑기!`,
          });
        } else if (ev.type === 'skillApplied') {
          const parts: string[] = [`${teamLabel(ev.team)} ${ANIMAL_INFO[ev.animal].emoji} ${ANIMAL_INFO[ev.animal].name} 스킬 발동!`];
          if (ev.myScoreDelta > 0) {
            const r = range.get(`${i}:main`)!;
            parts.push(`내 점수 +${ev.myScoreDelta} (${r.before} → ${r.after})`);
          }
          if (ev.oppScoreDelta > 0) parts.push(`상대 점수 -${ev.oppScoreDelta}`);
          if (ev.extraDrawsQueued > 0) parts.push(`다음 턴 추가 뽑기 ${ev.extraDrawsQueued}회 예약`);
          newLines.push({ team: ev.team, text: parts.join(' ') });
        } else if (ev.type === 'skillPassed' && !ev.auto) {
          newLines.push({ team: ev.team, text: `${teamLabel(ev.team)} 다음 기회를 노리기로 했습니다 (레벨을 더 모으는 중).` });
        } else if (ev.type === 'expand') {
          newLines.push({ team: null, text: '더 신나게!! 도토리 폭탄이 등장합니다.' });
        } else if (ev.type === 'timeoutChoice') {
          newLines.push({
            team: null,
            text: ev.animal
              ? `시간 초과로 서버가 대신 ${ANIMAL_INFO[ev.animal].name} 스킬을 선택했습니다.`
              : '시간 초과로 아무 스킬도 선택되지 않아 턴이 넘어갔습니다.',
          });
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

    // ── Pass 1: 뽑기(draw) + 예약된 추가 뽑기(bonusDraws) 애니메이션 ────────
    let cursor = 0;
    let bonusRollTeam: Team | null = null;
    let bonusRollRemaining = 0;
    let bonusRollIdx = 0;
    let bonusRollTotal = 0;
    let comboCounter = 0;
    let lastDrawEndCursor = 0;

    for (const ev of lastEvents) {
      if (ev.type === 'draw') {
        const inRoll = bonusRollRemaining > 0;
        const triggerAt = cursor;

        if (inRoll) {
          bonusRollRemaining--;
          bonusRollIdx++;
          const team = bonusRollTeam!;
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

        // 슬롯이 뜨고 0.3초 뒤에 card_1/card_2 사운드를 재생한다(스핀 종료까지는 기다리지 않음).
        const pitch = inRoll ? Math.min(1.35, 1 + (bonusRollIdx - 1) * 0.035) : 1;
        sched(() => playRandomSound('card', pitch), slotAt + 300);

        sched(() => {
          setNewCardId(card.id);
          setRevealedCardIds(prev => (prev.has(card.id) ? prev : new Set(prev).add(card.id)));
          sched(() => setNewCardId(prev => (prev === card.id ? null : prev)), REACTION_DUR);
        }, drawEndsAt - 120);

        if (inRoll) {
          const combo = ++comboCounter;
          const comboId = ++floatIdCounter;
          const progressTeam = bonusRollTeam!;
          const progressCurrent = bonusRollIdx;
          const progressTotal = bonusRollTotal;
          sched(() => {
            setSheepCombos(prev => [...prev, { id: comboId, place, combo }]);
            sched(() => setSheepCombos(prev => prev.filter(c => c.id !== comboId)), SHEEP_COMBO_DUR);

            // 콤보마다 진동 — 1콤보는 약하게 시작해 콤보가 쌓일수록 점점 강해진다
            setScreenShakeLevel(combo);
            sched(() => setScreenShakeLevel(0), SHAKE_PULSE_DUR);

            // 이번 턴에 예약된 추가 뽑기가 몇 번째까지 진행됐는지 계속 갱신해 보여준다.
            setSheepProgress({ team: progressTeam, current: progressCurrent, total: progressTotal });
          }, revealAt);

          if (bonusRollRemaining === 0) {
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
        const inRoll = bonusRollRemaining > 0;
        const triggerAt = cursor;

        if (inRoll) {
          bonusRollRemaining--;
          bonusRollIdx++;
          const team = bonusRollTeam!;
          const place = ev.place;
          const ballId = ++floatIdCounter;
          sched(() => {
            setWoolBalls(prev => [...prev, { id: ballId, team, place }]);
            sched(() => setWoolBalls(prev => prev.filter(b => b.id !== ballId)), WOOL_BALL_DUR);
          }, triggerAt);
        }

        const revealAt = inRoll ? triggerAt + WOOL_BALL_DUR : triggerAt;
        const drawEndsAt = revealAt + BOMB_FALL_DUR;
        const place = ev.place;
        const animal = ev.animal;
        const burstId = ++floatIdCounter;
        const clearedCardIds = ev.clearedCards.map(c => c.id);

        // 서버 배열에서는 이미 사라졌지만, 캐시에는 남겨둬서 떨어지는 연출이
        // 끝날 때까지 계속 그릴 수 있게 한다(이미 revealedCardIds엔 들어있는 카드들).
        ev.clearedCards.forEach(c => cardCacheRef.current.set(c.id, c));

        addPlaceFocus(place, revealAt);
        addCaption(`🌰 ${ANIMAL_INFO[animal].short} 카드 전부 폭발!`, 'pair', revealAt, { stackAnimal: animal });

        const bombInRoll = inRoll;
        const bombProgressTeam = bonusRollTeam;
        const bombProgressCurrent = bonusRollIdx;
        const bombProgressTotal = bonusRollTotal;

        sched(() => {
          // 도토리 폭죽과 카드가 흔들리며 떨어지는 연출을 동시에 보여준 다음에만 사라지게 한다.
          setBombBursts(prev => [...prev, { id: burstId, animal }]);
          setBombFallingIds(prev => new Set([...prev, ...clearedCardIds]));
          playRandomSound('bomb', 1, 1, 'tiger'); // bomb 전용 효과음이 없으면 특허랑이 사운드로 대체
          setScreenShakeLevel(prevLvl => Math.max(prevLvl, 2));
          sched(() => setScreenShakeLevel(0), SHAKE_PULSE_DUR);

          if (bombInRoll && bombProgressTeam) {
            setSheepProgress({ team: bombProgressTeam, current: bombProgressCurrent, total: bombProgressTotal });
          }

          // 폭탄이 터지면 양 팀 모두에게 해당 동물의 "cry" 표정을 보여준다.
          const gs = gameStateRef.current;
          if (gs) {
            (['A', 'B'] as Team[]).forEach((t, i) => {
              addEmoticon(t, gs.teams[t].playerIndex, emoticonFile(animal, 'cry'), 0, revealAt + i * 120);
            });
          }

          sched(() => setBombBursts(prev => prev.filter(b => b.id !== burstId)), BOMB_FALL_DUR);
          sched(() => {
            setBombFallingIds(prev => {
              const next = new Set(prev);
              clearedCardIds.forEach(id => next.delete(id));
              return next;
            });
            setRevealedCardIds(prev => {
              const next = new Set(prev);
              clearedCardIds.forEach(id => next.delete(id));
              return next;
            });
          }, BOMB_FALL_DUR);
        }, revealAt);

        lastDrawEndCursor = Math.max(lastDrawEndCursor, drawEndsAt);
        cursor = inRoll ? triggerAt + SHEEP_DRAW_STEP : drawEndsAt + EMPTY_GAP;
        continue;
      }

      if (ev.type === 'bonusDraws') {
        bonusRollTeam = ev.team;
        bonusRollRemaining = ev.count;
        bonusRollIdx = 0;
        bonusRollTotal = ev.count;

        if (ev.count >= 5) {
          const level = ev.count;
          sched(() => {
            setLeafParticleCount(level >= 12 ? 8 : 4);
            sched(() => setLeafParticleCount(0), 3000);
          }, cursor);
        }

        // "예약된 카드 N장 뽑기!" — 지난 턴 실용신양 스킬로 예약해둔 뽑기가 지금 소모됨을 예고한다.
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

    // ── Pass 1.5: 짝이 맞아 정산되는 동물들을 순서대로 재생 ─────────────────
    // 서버는 sheep→rabbit→mermaid→tiger 순으로 정산하지만, 화면에는 항상
    // 양→토끼→호랑이→인어 순으로 보여주고, 각 정산 사이엔 이전 정산의 애니메이션이
    // 끝난 직후 바로 이어지도록 짧은 여백만 둔다. 이번 액션에서 짝이 맞지 않은
    // 동물은 건너뛴다.
    {
      type CollectEvent = Extract<ClientGameEvent, { type: 'collect' }>;
      const collectEvents = lastEvents.filter((e): e is CollectEvent => e.type === 'collect');

      const SETTLE_ORDER: Animal[] = ['sheep', 'rabbit', 'tiger', 'mermaid'];
      const SETTLE_GAP = 150;

      const groups = SETTLE_ORDER.map(animal => ({
        animal,
        events: collectEvents.filter(e => e.animal === animal),
      }));

      cursor = Math.max(cursor, lastDrawEndCursor + EMPTY_GAP);
      let hasPlayedGroup = false;

      for (const group of groups) {
        if (group.events.length === 0) continue;
        if (hasPlayedGroup) cursor += SETTLE_GAP;
        hasPlayedGroup = true;

        for (const ev of group.events) {
          const { team, animal, cardIds } = ev;
          const flashKey = `${team}:${animal}`;
          const flashId = ++floatIdCounter;
          const at = cursor;
          const shakeId = ++floatIdCounter;

          addCaption(`${ANIMAL_INFO[animal].short} 페어!`, 'pair', at, { stackAnimal: animal });

          // 1) 카드가 스택에 다 모인 뒤, 짝이 맞았는지 "확인하듯" 스택 전체가 흔들린다.
          sched(() => {
            setShakingPile({ id: shakeId, animal });
            sched(() => setShakingPile(prev => (prev?.id === shakeId ? null : prev)), SHAKE_CHECK_DUR);
          }, at);

          // 2) 흔들기가 끝난 뒤에야 팀 쪽으로 날아가기 시작한다.
          const flingAt = at + SHAKE_CHECK_DUR;
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
          }, flingAt);

          // 3) 날아가기까지 완전히 끝난 뒤에야 스택에서 완전히 제거하고 다음 단계로 넘어간다.
          sched(() => {
            setCollectingCardIds(prev => {
              const next = new Set(prev);
              cardIds.forEach(id => next.delete(id));
              return next;
            });
            setRevealedCardIds(prev => {
              const next = new Set(prev);
              cardIds.forEach(id => next.delete(id));
              return next;
            });
          }, flingAt + COLLECT_FLING_DUR);

          cursor = flingAt + COLLECT_FLING_DUR + 80;
        }
      }
    }

    // ── Pass 1.6: 스킬 발동(skillApplied)/패스(skillPassed) — 정산과는 별개
    // 액션(선택 응답)에서 온다. 동물마다 원래 있었던 전용 연출을 그대로 재생한다.
    {
      const skillEv = lastEvents.find((e): e is Extract<ClientGameEvent, { type: 'skillApplied' }> => e.type === 'skillApplied');
      const passEv = lastEvents.find((e): e is Extract<ClientGameEvent, { type: 'skillPassed' }> => e.type === 'skillPassed');

      if (skillEv) {
        const { team, animal, myScoreDelta, oppScoreDelta } = skillEv;
        const opp: Team = team === 'A' ? 'B' : 'A';
        const at = cursor;

        addCaption(`${ANIMAL_INFO[animal].short} 스킬 발동!`, 'effect', at, { team });

        sched(() => {
          const gs = gameStateRef.current;
          if (gs) {
            addEmoticon(team, gs.teams[team].playerIndex, emoticonFile(animal, 'happy'), 0, at);
          }

          const flashScore = (flashTeam: Team, flashAnimal: Animal) => {
            const flashId = ++floatIdCounter;
            const flashKey = `${flashTeam}:${flashAnimal}`;
            setScoreFlash(prev => new Map([...prev, [flashKey, flashId]]));
            sched(() => {
              setScoreFlash(prev => {
                const next = new Map(prev);
                if (next.get(flashKey) === flashId) next.delete(flashKey);
                return next;
              });
            }, SCORE_FLASH_DUR);
          };

          if (animal === 'rabbit') {
            // 상표토끼 — 카드에서 점수판으로 날아가는 토끼 연출 복구
            playRandomSound('rabbit');
            if (myScoreDelta > 0) {
              flashScore(team, 'rabbit');
              const digits = String(myScoreDelta).length;
              const flightId = ++floatIdCounter;
              setRabbitFlights(prev => [...prev, { id: flightId, team, count: digits }]);
              sched(() => setRabbitFlights(prev => prev.filter(f => f.id !== flightId)), RABBIT_FLIGHT_DUR);
              addFloat(`+${myScoreDelta}`, team, 'bonus');

              setRabbitPressure({ sourceTeam: team, targetTeam: opp });
              sched(() => setRabbitPressure(null), RABBIT_PRESSURE_DUR);
            }
          } else if (animal === 'mermaid') {
            // 디자인어 — 큰 인어 팝업 복구
            playRandomSound('mermaid');
            setMermaidPopup({ team });
            sched(() => setMermaidPopup(null), MERMAID_POPUP_DUR);
            if (myScoreDelta > 0) {
              flashScore(team, 'mermaid');
              addFloat(`+${myScoreDelta}`, team, 'bonus');
            }
          } else if (animal === 'tiger') {
            // 특허랑이 — 공격자 반동 + 피격자 슬래시/비네트 복구
            setTigerRecoil({ attackerTeam: team });
            sched(() => setTigerRecoil(null), TIGER_RECOIL_DUR);
            sched(() => {
              setTigerSlash({ onTeam: opp });
              setTigerImpact(true);
              playRandomSound('tiger');
              sched(() => setTigerSlash(null), TIGER_HIT_DUR);
              sched(() => setTigerImpact(false), 600);
            }, TIGER_RECOIL_DUR);
            if (oppScoreDelta > 0) addFloat(`-${oppScoreDelta}`, opp, 'penalty');
          } else {
            // 실용신양 — 즉시 점수 변화는 없으므로 담백하게 카드 사운드만
            playRandomSound('card');
          }
        }, at);

        cursor = animal === 'tiger'
          ? at + TIGER_RECOIL_DUR + TIGER_HIT_DUR + 80
          : at + EFFECT_DUR;
      } else if (passEv && !passEv.auto) {
        const at = cursor;
        const text = PASS_CAPTIONS[Math.floor(Math.random() * PASS_CAPTIONS.length)];
        addCaption(text, 'effect', at, { team: passEv.team });
        cursor = at + 700;
      }
    }

    // ── expand는 턴 전환 이벤트라 위 재생이 모두 끝난 뒤에 이어 재생한다. ────
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

    // ── 정산 연출이 여기서 끝난다 — 이 시점에야 비로소 화면상의 턴을 실제 서버 상태로 넘긴다. ──
    sched(() => {
      setIsSettling(false);
      const latest = gameStateRef.current;
      if (latest) {
        setDisplayedActiveTeam(latest.activeTeam);
        setDisplayedActivePlayerIndex(latest.activePlayerIndex);
      }
    }, cursor);

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

  // 실제로 화면에 그릴 카드 목록 — revealedCardIds에 있는 카드만, id(=뽑힌 순서)
  // 오름차순으로 정렬해 동물별로 묶는다. 원본 데이터는 gameState가 아니라
  // cardCacheRef에서 가져오므로, 서버 배열에서 이미 사라진(폭탄) 카드도 떨어지는
  // 연출이 끝날 때까지는 계속 그릴 수 있다.
  const stackCards = useMemo(() => {
    const result: Record<Animal, StackedCard[]> = { sheep: [], rabbit: [], mermaid: [], tiger: [] };
    const ids = [...revealedCardIds].sort((a, b) => a - b);
    for (const id of ids) {
      const c = cardCacheRef.current.get(id);
      if (c) result[c.animal].push(c);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCardIds]);

  return {
    screenShakeLevel,
    leafParticleCount,
    floatingTexts,
    sheepCombos,
    mainCombo,
    sheepLoaded,
    sheepProgress,
    rabbitFlights,
    rabbitPressure,
    tigerSlash,
    tigerRecoil,
    tigerImpact,
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
    bombFallingIds,
    shakingPile,
    newCardId,
    stackCards,
    displayedActiveTeam,
    displayedActivePlayerIndex,
    isSettling,
  };
}
