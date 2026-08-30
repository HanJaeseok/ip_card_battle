'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClientGameState, Team } from 'shared';
import { CardGrid } from './CardGrid';
import { MermaidPopup } from './MermaidPopup';

interface DustParticle {
  id: number;
  x: number;   // %
  drift: number; // px
  fall: number;  // px
  dur: number;   // ms
  delay: number; // ms
  size: number;  // rem
  emoji: string;
}

const DUST_EMOJI = ['💨', '🪨', '💥'];

function generateDust(seed: number): DustParticle[] {
  const particles: DustParticle[] = [];
  for (let i = 0; i < 26; i++) {
    const h = ((seed * 31 + i * 97) % 100 + 100) % 100;
    particles.push({
      id: seed * 100 + i,
      x: (h * 1.3 + i * 13) % 96 + 2,
      drift: ((i * 41 + h) % 90) - 45,
      fall: 180 + (h % 160),
      dur: 650 + (h % 550),
      delay: (i * 28) % 450,
      size: 0.75 + (h % 10) / 12,
      emoji: DUST_EMOJI[(i + h) % DUST_EMOJI.length],
    });
  }
  return particles;
}

export function BoardPanel({
  gameState,
  myTeam,
  onCardClick,
  suppressedKeys,
  recentlyOpenedKeys,
  reactionMap,
  joltAllFaceDown,
  boardBreathe,
  collectGlowKeys,
  expandQuake,
  expandBurst,
  mermaidPopup,
}: {
  gameState: ClientGameState;
  myTeam: Team | null;
  onCardClick: (key: string) => void;
  suppressedKeys: ReadonlySet<string>;
  recentlyOpenedKeys: ReadonlySet<string>;
  reactionMap: ReadonlyMap<string, number>;
  joltAllFaceDown: boolean;
  boardBreathe: boolean;
  collectGlowKeys: ReadonlyMap<string, string>;
  expandQuake: boolean;
  expandBurst: number;
  mermaidPopup: { team: Team } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);

  // 마운트 후 보드 중앙 배치
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const cx = (container.clientWidth - content.offsetWidth) / 2;
    const cy = (container.clientHeight - content.offsetHeight) / 2;
    setOffset({ x: Math.max(8, cx), y: Math.max(8, cy) });
  }, [gameState.expanded]);

  // 휠 줌 (passive: false 필요)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => {
      const next = Math.min(3, Math.max(0.2, prev * factor));
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ratio = next / prev;
        setOffset(o => ({
          x: mx - (mx - o.x) * ratio,
          y: my - (my - o.y) * ratio,
        }));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // 드래그 팬 (pointer events로 마우스+터치 통합)
  // 주의: pointerdown 시점에 곧바로 setPointerCapture를 걸면, 실제 드래그가 아닌
  // 단순 클릭에서도 이후의 click 이벤트가 캡처한 요소(컨테이너)로 리타깃되어
  // 카드 버튼의 onClick이 아예 호출되지 않는다. 따라서 실제 이동 임계값을
  // 넘어선 순간에만 캡처를 걸어 클릭과 드래그를 구분한다.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    didMove.current = false;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    if (!didMove.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      didMove.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const isMyTurn =
    myTeam !== null && gameState.activeTeam === myTeam;

  const handleCardClick = useCallback((key: string) => {
    if (didMove.current) return;
    onCardClick(key);
  }, [onCardClick]);

  const dust = useMemo(
    () => (expandBurst > 0 ? generateDust(expandBurst) : []),
    [expandBurst],
  );

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative bg-jungle-50/50 rounded-2xl border border-jungle-200 ${expandQuake ? 'quake-expand' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: 'max-content',
          height: 'max-content',
          position: 'absolute',
          top: 0,
          left: 0,
          userSelect: 'none',
        }}
      >
        <CardGrid
          board={gameState.board}
          expanded={gameState.expanded}
          isMyTurn={isMyTurn}
          onCardClick={handleCardClick}
          suppressedKeys={suppressedKeys}
          recentlyOpenedKeys={recentlyOpenedKeys}
          reactionMap={reactionMap}
          joltAllFaceDown={joltAllFaceDown}
          breathe={boardBreathe}
          collectGlowKeys={collectGlowKeys}
        />
      </div>

      {/* 보드 확장 — 섬광 + 충격파 링 + 떨어지는 먼지/잔해 (뷰포트 기준) */}
      {expandBurst > 0 && (
        <>
          <div className="expand-flash" />
          <div className="expand-ring" style={{ '--ring-delay': '0ms' } as React.CSSProperties} />
          <div className="expand-ring" style={{ '--ring-delay': '120ms' } as React.CSSProperties} />
          <div className="expand-ring" style={{ '--ring-delay': '240ms' } as React.CSSProperties} />
        </>
      )}
      {dust.length > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 42 }}>
          {dust.map(d => (
            <span
              key={d.id}
              className="dust-particle"
              style={{
                left: `${d.x}%`,
                top: 0,
                '--dust-drift': `${d.drift}px`,
                '--dust-fall': `${d.fall}px`,
                '--dust-dur': `${d.dur}ms`,
                '--dust-delay': `${d.delay}ms`,
                '--dust-size': `${d.size}rem`,
              } as React.CSSProperties}
            >
              {d.emoji}
            </span>
          ))}
        </div>
      )}

      {/* 디자인어 효과 — 발동한 팀 쪽에서 큰 인어가 나와 음표를 흩뿌린다 */}
      {mermaidPopup && <MermaidPopup team={mermaidPopup.team} />}

      {/* 줌 힌트 */}
      <div className="absolute bottom-2 right-2 text-xs text-jungle-400 bg-white/70 px-2 py-1 rounded-md pointer-events-none select-none">
        휠: 줌 · 드래그: 이동
      </div>
    </div>
  );
}
