export function TigerAttackBar({
  lastLevelTiger,
  turn,
}: {
  lastLevelTiger: number;
  turn: number;
}) {
  const atk = Math.round((lastLevelTiger + 1) * turn * 1.5);

  return (
    <div className="w-full text-center py-1 px-2 rounded-md bg-orange-950/40 border border-orange-700/50 mt-1">
      <span className="text-xs font-semibold text-orange-300 tracking-wide">
        ⚔ 현재 공격력 {atk}
      </span>
    </div>
  );
}
