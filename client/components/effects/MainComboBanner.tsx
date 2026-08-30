'use client';

import type { MainCombo } from '@/hooks/useAnimationQueue';

// 실용신양 연쇄가 끝난 시점에 최종 콤보 수를 화면 중앙에 크게 보여준다.
// 콤보 수에 따라 색 단계가 올라가 "지금 얼마나 몰아쳤는지"를 한눈에 알 수 있다.
export function MainComboBanner({ combo }: { combo: MainCombo | null }) {
  if (!combo || combo.combo < 2) return null;

  const tier = combo.combo >= 6 ? 'hot' : combo.combo >= 3 ? 'warm' : 'base';

  return (
    <div
      key={combo.id}
      className={`main-combo-banner main-combo-${tier}`}
      aria-hidden
    >
      {combo.combo} COMBO!
    </div>
  );
}
