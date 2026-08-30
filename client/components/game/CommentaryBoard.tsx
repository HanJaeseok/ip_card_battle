'use client';

import { useEffect, useRef } from 'react';
import type { CommentaryLine } from '@/hooks/useAnimationQueue';

export function CommentaryBoard({
  lines,
}: {
  lines: CommentaryLine[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 줄이 추가되면 항상 최신 내용이 보이도록 맨 아래로 스크롤.
  // 최대 줄 수(COMMENTARY_MAX)에 도달하면 배열 길이가 더 이상 늘지 않으므로
  // length가 아니라 배열 자체(매번 새 참조로 갱신됨)를 의존성으로 사용해야 한다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="h-[21rem] shrink-0 bg-white rounded-2xl border border-jungle-200 px-4 py-3 flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="text-lg text-jungle-300">아직 소식이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {lines.map(line => (
              <li
                key={line.id}
                className={`text-lg leading-snug font-semibold ${
                  line.team === 'A'
                    ? 'text-emerald-700'
                    : line.team === 'B'
                      ? 'text-blue-700'
                      : 'text-jungle-500'
                }`}
              >
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
