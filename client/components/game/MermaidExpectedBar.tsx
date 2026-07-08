export function MermaidExpectedBar({
  myTotal,
  opTotal,
  turn,
}: {
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

  return (
    <div
      className={`text-center py-1.5 px-3 rounded-full shadow-sm ${
        isBehind ? 'bg-blue-600' : 'bg-amber-500'
      }`}
    >
      <span className="text-sm font-bold text-white tracking-wide leading-tight">
        {label} +{value}
      </span>
    </div>
  );
}
