import { THRESHOLDS } from 'shared';

export function MermaidExpectedBar({
  mermaidScore,
  myTotal,
  opTotal,
  turn,
}: {
  mermaidScore: number;
  myTotal: number;
  opTotal: number;
  turn: number;
}) {
  const isBehind = myTotal < opTotal;

  let label: string;
  let value: number;

  if (isBehind) {
    value = Math.round((opTotal - myTotal) * 0.5);
    label = '🔵 예상 흡수';
  } else {
    value = Math.round(1 * turn * 0.3);
    label = '✨ 예상 보너스';
  }

  const threshold = THRESHOLDS.mermaid;
  const progress = ((mermaidScore % threshold) / threshold) * 100;

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
      <div className="relative text-center py-1.5 px-3">
        <span className="text-sm font-bold text-white tracking-wide leading-tight">
          {label} +{value}
        </span>
      </div>
    </div>
  );
}
