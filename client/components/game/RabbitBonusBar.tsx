export function RabbitBonusBar({ turn }: { turn: number }) {
  // 상표토끼는 10점 구간을 새로 넘으면 1 × 현재턴수 만큼 보너스를 받는다
  return (
    <div className="text-center py-1.5 px-3 rounded-full bg-pink-500 shadow-sm">
      <span className="text-sm font-bold text-white tracking-wide leading-tight">
        🎯 다음 보너스 +{turn}점
      </span>
    </div>
  );
}
