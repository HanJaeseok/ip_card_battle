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
      className={`w-full text-center py-1 px-2 rounded-md border mt-1 ${
        isBehind
          ? 'bg-blue-950/40 border-blue-600/50'
          : 'bg-yellow-950/40 border-yellow-600/50'
      }`}
    >
      <span
        className={`text-xs font-semibold tracking-wide ${
          isBehind ? 'text-blue-300' : 'text-yellow-300'
        }`}
      >
        {label} +{value}
      </span>
    </div>
  );
}
