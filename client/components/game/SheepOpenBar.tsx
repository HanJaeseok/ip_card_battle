export function SheepOpenBar({ count }: { count: number }) {
  // 실용신양 연쇄로 지금까지 추가로 오픈된 누적 카드 수 (동작 확인용 라이브 카운터)
  return (
    <div className="text-center py-1.5 px-3 rounded-full bg-lime-600 shadow-sm">
      <span className="text-sm font-bold text-white tracking-wide leading-tight">
        추가 카드 오픈 +{count}장
      </span>
    </div>
  );
}
