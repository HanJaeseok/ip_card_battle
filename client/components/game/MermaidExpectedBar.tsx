import { THRESHOLDS } from 'shared';
import { predictMermaid } from '@/lib/predict';

export function MermaidExpectedBar({
  mermaidScore,
  lastLevelMermaid,
  myTotal,
  opTotal,
  turn,
  boardTotal,
}: {
  mermaidScore: number;
  lastLevelMermaid: number;
  myTotal: number;
  opTotal: number;
  turn: number;
  boardTotal: number;
}) {
  const threshold = THRESHOLDS.mermaid;
  const scoreMod = mermaidScore % threshold;
  const progress = (scoreMod / threshold) * 100;
  const predicted = predictMermaid(mermaidScore, boardTotal, lastLevelMermaid, turn, myTotal, opTotal);

  const isBehind = predicted?.type === 'catchup';

  return (
    <div
      className={`rounded-full shadow-sm overflow-hidden relative ${
        isBehind ? 'bg-blue-600' : 'bg-amber-500'
      }`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative text-center py-1 px-3">
        <p className="text-[0.65rem] text-white/80 leading-none mb-0.5">
          현재 카드 획득 +{boardTotal}
        </p>
        <p className="text-sm font-bold text-white tracking-wide leading-tight">
          {predicted
            ? isBehind
              ? `🔵 점수 획득시 흡수 +${predicted.value}`
              : `✨ 점수 획득시 보너스 +${predicted.value}`
            : '발동 없음'}
        </p>
      </div>
    </div>
  );
}
