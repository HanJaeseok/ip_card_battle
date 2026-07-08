'use client';

import type { Animal, ClientGameState } from 'shared';
import { ANIMALS, CARDS_PER_ANIMAL_INIT, CARDS_PER_ANIMAL_EXP } from 'shared';
import { ANIMAL_INFO } from '@/lib/animals';

const BAR_COLOR: Record<Animal, string> = {
  sheep: '#facc15',
  rabbit: '#f472b6',
  mermaid: '#38bdf8',
  tiger: '#fb923c',
};

/** 동물별 오픈된 카드 수 / 전체 카드 수 — 매 렌더마다 gameState에서 직접 계산해
 * 카드 오픈·보드 확장 시 항상 최신 상태를 반영한다. */
export function IpStatusBar({ gameState }: { gameState: ClientGameState }) {
  const total = CARDS_PER_ANIMAL_INIT + (gameState.expanded ? CARDS_PER_ANIMAL_EXP : 0);
  const openCounts: Record<Animal, number> = { sheep: 0, rabbit: 0, mermaid: 0, tiger: 0 };
  for (const entry of gameState.board) {
    if (entry.card.open) openCounts[entry.card.animal]++;
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {ANIMALS.map(a => {
        const open = openCounts[a];
        const pct = Math.min(100, (open / total) * 100);
        return (
          <div key={a} className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-sm shrink-0" title={ANIMAL_INFO[a].name}>
              {ANIMAL_INFO[a].emoji}
            </span>
            <div className="relative flex-1 min-w-[3.5rem] h-4 bg-jungle-100 rounded-full overflow-hidden border border-jungle-200">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: BAR_COLOR[a] }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-jungle-900 tabular-nums leading-none">
                {open}/{total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
