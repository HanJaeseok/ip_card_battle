import type { ClientGameState, Team } from 'shared';
import { LeafDecoration } from '@/components/ui/LeafDecoration';
import { GameHeader } from './GameHeader';
import { TeamPanel } from './TeamPanel';
import { BoardPanel } from './BoardPanel';

export function GameLayout({
  gameState,
  myTeam,
  onCardClick,
  error,
}: {
  gameState: ClientGameState;
  myTeam: Team | null;
  onCardClick: (key: string) => void;
  error: string | null;
}) {
  return (
    <div className="min-h-screen bg-jungle-50 flex flex-col relative overflow-hidden">
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
        <TeamPanel team="A" gameState={gameState} />
        <BoardPanel
          gameState={gameState}
          myTeam={myTeam}
          onCardClick={onCardClick}
        />
        <TeamPanel team="B" gameState={gameState} />
      </main>
    </div>
  );
}
