import { THRESHOLDS } from 'shared';

export function RabbitBonusBar({ rabbitScore, turn }: { rabbitScore: number; turn: number }) {
  // 상표토끼는 10점 구간을 새로 넘으면 1 × 현재턴수 만큼 보너스를 받는다.
  // 다음 발동까지 얼마나 남았는지 게이지로 보여줘 "점점 불어나는" 압박감을 준다.
  const threshold = THRESHOLDS.rabbit;
  const scoreMod = rabbitScore % threshold;
  const progress = (scoreMod / threshold) * 100;

  return (
    <div className="rounded-full bg-pink-500 shadow-sm overflow-hidden relative">
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative text-center py-1 px-3">
        <p className="text-[0.65rem] text-white/80 leading-none mb-0.5">
          {threshold}점마다 · {scoreMod}/{threshold}
        </p>
        <p className="text-sm font-bold text-white tracking-wide leading-tight">
          🎯 다음 보너스 +{turn}점
        </p>
      </div>
    </div>
  );
}
