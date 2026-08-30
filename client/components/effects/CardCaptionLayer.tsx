'use client';

import type { CaptionItem } from '@/hooks/useAnimationQueue';

// 카드판 위에 "무엇을 뒤집었는지 / 페어 성사 / 효과 발동"을 큰 자막으로 강조한다.
// 보드 컨테이너(팬/줌이 적용되지 않는 바깥 레이어) 안에 그려야 확대/축소와 무관하게
// 항상 화면 중앙에 고정된다.
export function CardCaptionLayer({ captions }: { captions: CaptionItem[] }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none z-40">
      {captions.map(c => (
        <span key={c.id} className={`card-caption card-caption-${c.tier}`}>
          {c.text}
        </span>
      ))}
    </div>
  );
}
