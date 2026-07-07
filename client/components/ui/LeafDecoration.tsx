type Position = 'tl' | 'tr' | 'bl' | 'br';

const TRANSFORMS: Record<Position, string> = {
  tl: 'rotate(0deg)',
  tr: 'scaleX(-1)',
  bl: 'scaleY(-1)',
  br: 'scale(-1, -1)',
};

const POSITIONS: Record<Position, string> = {
  tl: 'top-0 left-0',
  tr: 'top-0 right-0',
  bl: 'bottom-0 left-0',
  br: 'bottom-0 right-0',
};

export function LeafDecoration({ position }: { position: Position }) {
  return (
    <div className={`absolute ${POSITIONS[position]} z-10 pointer-events-none w-20 h-20`}>
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        style={{ transform: TRANSFORMS[position] }}
        className="leaf-sway pointer-events-auto"
      >
        {/* 메인 잎사귀 */}
        <path
          d="M8 72 Q20 40 60 10 Q65 35 50 55 Q35 72 8 72Z"
          fill="#15803d"
          opacity="0.85"
        />
        {/* 잎맥 */}
        <path
          d="M8 72 Q35 42 60 10"
          stroke="#166534"
          strokeWidth="1.2"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M30 55 Q42 42 55 28"
          stroke="#166534"
          strokeWidth="0.8"
          fill="none"
          opacity="0.5"
        />
        {/* 작은 잎 */}
        <path
          d="M5 60 Q15 45 35 38 Q32 52 20 60 Q12 65 5 60Z"
          fill="#22c55e"
          opacity="0.7"
        />
        {/* 나뭇가지 */}
        <path
          d="M2 78 Q10 68 18 58"
          stroke="#92400e"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
