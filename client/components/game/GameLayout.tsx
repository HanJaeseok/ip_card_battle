import type { ClientGameState, Team } from 'shared';
import type { AnimationState } from '@/hooks/useAnimationQueue';
import { LeafDecoration } from '@/components/ui/LeafDecoration';
import { EffectLayer } from '@/components/effects/EffectLayer';
import { RabbitFlightLayer } from '@/components/effects/RabbitFlightLayer';
import { GameHeader } from './GameHeader';
import { TeamPanel } from './TeamPanel';
import { BoardPanel } from './BoardPanel';
import { CommentaryBoard } from './CommentaryBoard';

function shakeClass(level: number): string {
  if (level === 0) return '';
  if (level >= 8) return 'shake-strong';
  if (level >= 5) return 'shake-medium';
  return 'shake-small';
}

export function GameLayout({
  gameState,
  myTeam,
  onCardClick,
  error,
  animState,
}: {
  gameState: ClientGameState;
  myTeam: Team | null;
  onCardClick: (key: string) => void;
  error: string | null;
  animState: AnimationState;
}) {
  return (
    <div
      className={`min-h-screen bg-jungle-50 flex flex-col relative overflow-hidden ${shakeClass(animState.screenShakeLevel)}`}
    >
      {/* 모서리 잎사귀 장식 */}
      <LeafDecoration position="tl" />
      <LeafDecoration position="tr" />
      <LeafDecoration position="bl" />
      <LeafDecoration position="br" />

      <GameHeader gameState={gameState} />

      {error && (
        <div className="bg-red-100 border-b border-red-200 text-red-700 text-sm text-center py-1.5 px-4 shrink-0">
          {error}
        </div>
      )}

      {/* 3열 레이아웃 */}
      <main className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
        <TeamPanel team="A" gameState={gameState} animState={animState} />
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <BoardPanel
            gameState={gameState}
            myTeam={myTeam}
            onCardClick={onCardClick}
            suppressedKeys={animState.suppressedKeys}
            reactionMap={animState.reactionMap}
            joltAllFaceDown={animState.joltAllFaceDown}
            boardBreathe={animState.boardBreathe}
            collectGlowKeys={animState.collectGlowKeys}
            expandQuake={animState.expandQuake}
            expandBurst={animState.expandBurst}
            mermaidPopup={animState.mermaidPopup}
          />
          <CommentaryBoard lines={animState.commentary} />
        </div>
        <TeamPanel team="B" gameState={gameState} animState={animState} />
      </main>

      {/* 화면 오버레이 이펙트 (나뭇잎, 플로팅 텍스트) */}
      <EffectLayer
        leafParticleCount={animState.leafParticleCount}
        floatingTexts={animState.floatingTexts}
      />

      {/* 상표토끼 보너스 — 카드 → 점수판 플라이트 (fixed, 화면 전역) */}
      <RabbitFlightLayer flights={animState.rabbitFlights} />
    </div>
  );
}
