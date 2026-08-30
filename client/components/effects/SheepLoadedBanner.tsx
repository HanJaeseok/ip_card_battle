'use client';

import type { SheepLoaded } from '@/hooks/useAnimationQueue';

// 실용신양 효과가 발동되는 순간, 이번 액션에서 양이 몇 마리 굴러갈지(=추가로 몇 장을
// 더 뽑을지) 화면 중앙에 큼직하게 예고한다 — 콤보 텍스트만으로는 눈에 잘 안 띈다는
// 피드백을 반영해 신설.
export function SheepLoadedBanner({ loaded }: { loaded: SheepLoaded | null }) {
  if (!loaded) return null;

  return (
    <div key={loaded.id} className="sheep-loaded-banner" aria-hidden>
      🐑 실용신양의 {loaded.count}번째 힘!
    </div>
  );
}
