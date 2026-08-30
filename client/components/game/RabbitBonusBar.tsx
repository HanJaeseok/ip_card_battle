import { THRESHOLDS } from 'shared';
import { predictRabbitBonus } from '@/lib/predict';

export function RabbitBonusBar({
  rabbitScore,
  lastLevelRabbit,
  turn,
  boardTotal,
}: {
  rabbitScore: number;
  lastLevelRabbit: number;
  turn: number;
  boardTotal: number;
}) {
  const threshold = THRESHOLDS.rabbit;
  const scoreMod = rabbitScore % threshold;
  const progress = (scoreMod / threshold) * 100;
  const bonus = predictRabbitBonus(rabbitScore, boardTotal, lastLevelRabbit, turn);

  return (
    <div className="rounded-full bg-pink-500 shadow-sm overflow-hidden relative">
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative text-center py-1 px-3">
        <p className="text-[0.65rem] text-white/80 leading-none mb-0.5">
          현재 카드 획득 +{boardTotal}
        </p>
        <p className="text-sm font-bold text-white tracking-wide leading-tight">
          🎯 {bonus > 0 ? `점수 획득시 +${bonus}` : '발동 없음'}
        </p>
      </div>
    </div>
  );
}
