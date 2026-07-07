'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Team } from 'shared';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameLayout } from '@/components/game/GameLayout';
import { GameEndScreen } from '@/components/game/GameEndScreen';

const STORAGE_TEAM = 'cardBattle_team';

export default function GamePage() {
  const router = useRouter();
  const { gameState, openCard, error, connected } = useWebSocket();
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_TEAM) as Team | null;
    if (saved === 'A' || saved === 'B') setMyTeam(saved);
  }, []);

  const handleCardClick = useCallback(
    (key: string) => {
      const [r, c] = key.split(',').map(Number);
      openCard(r, c);
    },
    [openCard],
  );

  if (!gameState) {
    return (
      <div className="min-h-screen bg-jungle-50 flex flex-col items-center justify-center gap-3">
        <p className="text-jungle-700">
          {connected ? '게임 상태 로딩 중...' : '서버에 연결 중...'}
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-jungle-400 underline mt-4 hover:text-jungle-600"
        >
          로비로 돌아가기
        </button>
      </div>
    );
  }

  if (gameState.phase === 'ended') {
    return <GameEndScreen gameState={gameState} onBack={() => router.push('/')} />;
  }

  return (
    <GameLayout
      gameState={gameState}
      myTeam={myTeam}
      onCardClick={handleCardClick}
      error={error}
    />
  );
}
