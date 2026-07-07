'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientGameState, Team } from 'shared';
import { CardGrid } from './CardGrid';

export function BoardPanel({
  gameState,
  myTeam,
  onCardClick,
}: {
  gameState: ClientGameState;
  myTeam: Team | null;
  onCardClick: (key: string) => void;
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
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    didMove.current = false;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove.current = true;
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  const isMyTurn =
    myTeam !== null && gameState.activeTeam === myTeam;

  const handleCardClick = useCallback((key: string) => {
    if (didMove.current) return;
    onCardClick(key);
  }, [onCardClick]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative bg-jungle-50/50 rounded-2xl border border-jungle-200"
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
        />
      </div>

      {/* 줌 힌트 */}
      <div className="absolute bottom-2 right-2 text-xs text-jungle-400 bg-white/70 px-2 py-1 rounded-md pointer-events-none select-none">
        휠: 줌 · 드래그: 이동
      </div>
    </div>
  );
}
