export function TigerAttackBar({
  lastLevelTiger,
  turn,
}: {
  lastLevelTiger: number;
  turn: number;
}) {
  const atk = Math.round((lastLevelTiger + 1) * turn * 1.5);

  return (
    <div className="text-center py-1.5 px-3 rounded-full bg-orange-600 shadow-sm">
      <span className="text-sm font-bold text-white tracking-wide leading-tight">
        ⚔ 공격력 {atk}
      </span>
    </div>
  );
}
