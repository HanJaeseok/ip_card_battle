'use client';

import type { Animal, ClientGameState, Place, StackedCard, Team } from 'shared';
import { PLACES } from 'shared';
import { PlaceTile } from './PlaceTile';
import { AnimalStackArea } from './AnimalStackArea';
import { CardCaptionLayer } from '@/components/effects/CardCaptionLayer';
import { CardFocusLayer } from '@/components/effects/CardFocusLayer';
import { DrawSlotLayer } from '@/components/effects/DrawSlotLayer';
import { WoolBallLayer } from '@/components/effects/WoolBallLayer';
import { BombBurstLayer } from '@/components/effects/BombBurstLayer';
import { MermaidPopup } from './MermaidPopup';
import type {
  BombBurstItem,
  CaptionItem,
  DrawSlotItem,
  PlaceFocusItem,
  ShakingPile,
  WoolBallItem,
} from '@/hooks/useAnimationQueue';

const GRID_AREA: Record<Place, string> = {
  house: 'house',
  forest_road: 'forest',
  dock: 'dock',
  river_road: 'river',
};

export function GameBoard({
  gameState,
  myTeam,
  onPlaceClick,
  captions,
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
  expandFlash,
  mermaidPopup,
}: {
  gameState: ClientGameState;
  myTeam: Team | null;
  onPlaceClick: (place: Place) => void;
  captions: CaptionItem[];
  placeFocusBursts: PlaceFocusItem[];
  drawSlots: DrawSlotItem[];
  woolBalls: WoolBallItem[];
  bombBursts: BombBurstItem[];
  collectingCardIds: ReadonlySet<number>;
  bombFallingIds: ReadonlySet<number>;
  shakingPile: ShakingPile | null;
  newCardId: number | null;
  stackCards: Record<Animal, StackedCard[]>;
  displayedActiveTeam: Team;
  expandFlash: boolean;
  mermaidPopup: { team: Team } | null;
}) {
  // 장소 클릭 가능 여부는 실제 서버 상태(gameState.activeTeam)를 그대로 따라야 한다 —
  // 정산 연출 중에는 이미 서버상 내 차례가 아니므로 클릭이 막혀 있는 게 맞다.
  const canAct = myTeam !== null && gameState.activeTeam === myTeam;
  // 테두리 펄스·동물 무드(happy/focus)는 정산 연출이 끝날 때까지 "내 차례"로 유지되는
  // 화면상 턴을 따른다.
  const isMyTurnDisplayed = myTeam !== null && displayedActiveTeam === myTeam;

  return (
    <div
      className={`flex-1 relative bg-jungle-50/50 rounded-2xl border-2 p-2 grid gap-2 ${
        isMyTurnDisplayed ? 'board-my-turn' : 'border-jungle-200'
      }`}
      style={{
        gridTemplateAreas: '"house center center dock" "forest center center river"',
        gridTemplateColumns: '1fr 1.6fr 1.6fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      {PLACES.map(place => (
        <div key={place} style={{ gridArea: GRID_AREA[place] }}>
          <PlaceTile
            place={place}
            disabled={!canAct}
            onClick={onPlaceClick}
            showBombWarning={gameState.expanded}
          />
        </div>
      ))}

      <div style={{ gridArea: 'center' }}>
        <AnimalStackArea
          stackCards={stackCards}
          collectingIds={collectingCardIds}
          bombFallingIds={bombFallingIds}
          shakingPile={shakingPile}
          newCardId={newCardId}
          isMyTurn={isMyTurnDisplayed}
        />
      </div>

      {expandFlash && <div className="expand-flash" />}
      {mermaidPopup && <MermaidPopup team={mermaidPopup.team} />}

      <CardCaptionLayer captions={captions} myTeam={myTeam} />
      <CardFocusLayer items={placeFocusBursts} />
      <DrawSlotLayer items={drawSlots} />
      <WoolBallLayer items={woolBalls} />
      <BombBurstLayer items={bombBursts} />
    </div>
  );
}
