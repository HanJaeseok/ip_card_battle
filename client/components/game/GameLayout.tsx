import type { Animal, ClientGameState, Place, Team } from 'shared';
import type { AnimationState } from '@/hooks/useAnimationQueue';
import { LeafDecoration } from '@/components/ui/LeafDecoration';
import { EffectLayer } from '@/components/effects/EffectLayer';
import { SheepComboLayer } from '@/components/effects/SheepComboLayer';
import { MainComboBanner } from '@/components/effects/MainComboBanner';
import { SheepLoadedBanner } from '@/components/effects/SheepLoadedBanner';
import { PlayerEmoticonLayer } from '@/components/effects/PlayerEmoticonLayer';
import { RabbitFlightLayer } from '@/components/effects/RabbitFlightLayer';
import { GameHeader } from './GameHeader';
import { TeamPanel } from './TeamPanel';
import { GameBoard } from './GameBoard';
import { SheepProgressBar } from './SheepProgressBar';
import { CommentaryBoard } from './CommentaryBoard';
import { SkillChoiceModal } from './SkillChoiceModal';

// 실용신양 콤보 번호 → 진동 강도 스케일. 1콤보는 약하게 시작해 콤보가 쌓일수록 점점 강해진다.
function shakeScale(combo: number): number {
  return Math.min(0.6 + (combo - 1) * 0.35, 3.2);
}

export function GameLayout({
  gameState,
  myTeam,
  onPlaceClick,
  onChooseSkill,
  onPassSkill,
  error,
  animState,
}: {
  gameState: ClientGameState;
  myTeam: Team | null;
  onPlaceClick: (place: Place) => void;
  onChooseSkill: (animal: Animal) => void;
  onPassSkill: () => void;
  error: string | null;
  animState: AnimationState;
}) {
  const isShaking = animState.screenShakeLevel > 0;
  // 정산 연출이 다 끝난 뒤, 내 팀이 스킬을 고를 차례일 때만 모달을 띄운다.
  const showSkillModal = !animState.isSettling && myTeam !== null && gameState.pendingChoice === myTeam;

  return (
    <div
      className={`min-h-screen bg-jungle-50 flex flex-col relative overflow-hidden ${isShaking ? 'shake-combo' : ''}`}
      style={isShaking ? ({ '--shake-scale': shakeScale(animState.screenShakeLevel) } as React.CSSProperties) : undefined}
    >
      {/* 모서리 잎사귀 장식 */}
      <LeafDecoration position="tl" />
      <LeafDecoration position="tr" />
      <LeafDecoration position="bl" />
      <LeafDecoration position="br" />

      <GameHeader
        gameState={gameState}
        displayedActiveTeam={animState.displayedActiveTeam}
        displayedActivePlayerIndex={animState.displayedActivePlayerIndex}
        isSettling={animState.isSettling}
      />

      {error && (
        <div className="bg-red-100 border-b border-red-200 text-red-700 text-sm text-center py-1.5 px-4 shrink-0">
          {error}
        </div>
      )}

      {/* 3열 레이아웃 */}
      <main className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
        <TeamPanel team="A" myTeam={myTeam} gameState={gameState} animState={animState} />
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <GameBoard
            gameState={gameState}
            myTeam={myTeam}
            onPlaceClick={onPlaceClick}
            captions={animState.captions}
            placeFocusBursts={animState.placeFocusBursts}
            drawSlots={animState.drawSlots}
            woolBalls={animState.woolBalls}
            bombBursts={animState.bombBursts}
            collectingCardIds={animState.collectingCardIds}
            bombFallingIds={animState.bombFallingIds}
            shakingPile={animState.shakingPile}
            newCardId={animState.newCardId}
            stackCards={animState.stackCards}
            displayedActiveTeam={animState.displayedActiveTeam}
            isSettling={animState.isSettling}
            expandFlash={animState.expandFlash}
            mermaidPopup={animState.mermaidPopup}
          />
          <CommentaryBoard lines={animState.commentary} />
        </div>
        <TeamPanel team="B" myTeam={myTeam} gameState={gameState} animState={animState} />
      </main>

      {/* 화면 오버레이 이펙트 (나뭇잎, 플로팅 텍스트) */}
      <EffectLayer
        leafParticleCount={animState.leafParticleCount}
        floatingTexts={animState.floatingTexts}
      />

      {/* 실용신양 발동 예고 — "예약된 카드 N장 뽑기!" */}
      <SheepLoadedBanner loaded={animState.sheepLoaded} />

      {/* 예약된 추가 뽑기 콤보 텍스트 (fixed, 화면 전역) */}
      <SheepComboLayer combos={animState.sheepCombos} />

      {/* 예약된 추가 뽑기 종료 — 최종 콤보 수 배너 */}
      <MainComboBanner combo={animState.mainCombo} />

      {/* 플레이어 프로필 옆 반응 이모티콘 (fixed, 화면 전역) */}
      <PlayerEmoticonLayer items={animState.emoticons} />

      {/* 실용신양 추가 뽑기 진행도 */}
      <SheepProgressBar progress={animState.sheepProgress} />

      {/* 상표토끼 스킬 발동 — 토끼 스택에서 팀 점수판으로 날아가는 토끼들 */}
      <RabbitFlightLayer flights={animState.rabbitFlights} />

      {/* 특허랑이 스킬 발동 — 화면 전체가 크게 흔들리는 타격 비네트 */}
      {animState.tigerImpact && <div className="tiger-vignette" />}

      {/* 턴 종료 — 4가지 스킬 중 하나를 고르는 모달 */}
      {showSkillModal && myTeam !== null && (
        <SkillChoiceModal gameState={gameState} team={myTeam} onChoose={onChooseSkill} onPass={onPassSkill} />
      )}
    </div>
  );
}
