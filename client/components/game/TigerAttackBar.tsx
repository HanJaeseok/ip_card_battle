import { THRESHOLDS } from 'shared';
import { predictTigerDmg } from '@/lib/predict';

export function TigerAttackBar({
  tigerScore,
  lastLevelTiger,
  turn,
  boardTotal,
}: {
  tigerScore: number;
  lastLevelTiger: number;
  turn: number;
  boardTotal: number;
}) {
  const threshold = THRESHOLDS.tiger;
  const scoreMod = tigerScore - lastLevelTiger * threshold;
  const progress = scoreMod / threshold;
  const dmg = predictTigerDmg(tigerScore, boardTotal, lastLevelTiger, turn);
  const isImminent = dmg > 0;

  return (
    <div
      className={`rounded-full shadow-sm overflow-hidden relative transition-colors ${
        isImminent ? 'bg-red-600 tiger-imminent' : 'bg-orange-600'
      }`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-black/30 transition-all"
        style={{ width: `${Math.min(100, progress * 100)}%` }}
      />
      <div className="relative text-center py-1 px-3">
        <p className="text-[0.65rem] text-white/80 leading-none mb-0.5">
          현재 카드 획득 +{boardTotal}
        </p>
        <p className="text-sm font-bold text-white tracking-wide leading-tight">
          ⚔ {isImminent ? `점수 획득시 공격력 ${dmg}` : '발동 없음'}
        </p>
      </div>
    </div>
  );
}
