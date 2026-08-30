import { THRESHOLDS } from 'shared';

export function SheepOpenBar({ sheepScore, count }: { sheepScore: number; count: number }) {
  // 현재 실용신양 점수(floor(score/10)) 기준 실시간 값 — 매 턴 이만큼 항상 추가 오픈되고,
  // 특허랑이에게 점수가 깎이면 이 수치도 즉시 함께 줄어든다.
  const threshold = THRESHOLDS.sheep;
  const progress = ((sheepScore % threshold) / threshold) * 100;

  return (
    <div className="rounded-full bg-lime-600 shadow-sm overflow-hidden relative">
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative text-center py-1.5 px-3">
        <span className="text-sm font-bold text-white tracking-wide leading-tight">
          추가 카드 오픈 +{count}장
        </span>
      </div>
    </div>
  );
}
