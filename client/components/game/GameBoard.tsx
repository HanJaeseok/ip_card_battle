'use client';

import type { ClientGameState, Place, Team } from 'shared';
import { PLACES } from 'shared';
import { PlaceTile } from './PlaceTile';
import { AnimalStackArea } from './AnimalStackArea';
import { MermaidPopup } from './MermaidPopup';
import { CardCaptionLayer } from '@/components/effects/CardCaptionLayer';
import { CardFocusLayer } from '@/components/effects/CardFocusLayer';
import { DrawSlotLayer } from '@/components/effects/DrawSlotLayer';
import { WoolBallLayer } from '@/components/effects/WoolBallLayer';
import { BombBurstLayer } from '@/components/effects/BombBurstLayer';
import type { BombBurstItem, CaptionItem, DrawSlotItem, PlaceFocusItem, WoolBallItem } from '@/hooks/useAnimationQueue';

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
  newCardId,
  revealedCardIds,
  mermaidPopup,
  expandFlash,
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
  newCardId: number | null;
  revealedCardIds: ReadonlySet<number>;
  mermaidPopup: { team: Team } | null;
  expandFlash: boolean;
}) {
  const isMyTurn = myTeam !== null && gameState.activeTeam === myTeam;

  return (
    <div
      className={`flex-1 relative bg-jungle-50/50 rounded-2xl border-2 p-2 grid gap-2 ${
        isMyTurn ? 'board-my-turn' : 'border-jungle-200'
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
            disabled={!isMyTurn}
            onClick={onPlaceClick}
            showBombWarning={gameState.expanded}
          />
        </div>
      ))}

      <div style={{ gridArea: 'center' }}>
        <AnimalStackArea
          stacks={gameState.stacks}
          collectingIds={collectingCardIds}
          newCardId={newCardId}
          revealedCardIds={revealedCardIds}
        />
      </div>

      {mermaidPopup && <MermaidPopup team={mermaidPopup.team} />}
      {expandFlash && <div className="expand-flash" />}

      <CardCaptionLayer captions={captions} myTeam={myTeam} />
      <CardFocusLayer items={placeFocusBursts} />
      <DrawSlotLayer items={drawSlots} />
      <WoolBallLayer items={woolBalls} />
      <BombBurstLayer items={bombBursts} />
    </div>
  );
}
