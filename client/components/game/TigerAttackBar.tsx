import { THRESHOLDS } from 'shared';

export function TigerAttackBar({
  tigerScore,
  lastLevelTiger,
  turn,
}: {
  tigerScore: number;
  lastLevelTiger: number;
  turn: number;
}) {
  const atk = Math.round((lastLevelTiger + 1) * turn * 1.5);
  const threshold = THRESHOLDS.tiger;
  const progress = (tigerScore - lastLevelTiger * threshold) / threshold;
  const isImminent = progress >= 0.8;

  return (
    <div
      className={`text-center py-1.5 px-3 rounded-full shadow-sm transition-colors ${
        isImminent ? 'bg-red-600 tiger-imminent' : 'bg-orange-600'
      }`}
    >
      <span className="text-sm font-bold text-white tracking-wide leading-tight">
        ⚔ 공격력 {atk}
        {isImminent && ' 곧 발동!'}
      </span>
    </div>
  );
}
