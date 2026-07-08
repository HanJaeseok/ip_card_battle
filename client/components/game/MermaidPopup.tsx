import type { Team } from 'shared';

const NOTES = [
  { x: -80, y: -160, rot: -20, delay: 250 },
  { x: 40, y: -216, rot: 15, delay: 420 },
  { x: 112, y: -128, rot: 25, delay: 600 },
  { x: -32, y: -232, rot: -10, delay: 780 },
  { x: 80, y: -176, rot: 10, delay: 950 },
];

export function MermaidPopup({ team }: { team: Team }) {
  return (
    <div className={`mermaid-popup ${team === 'A' ? 'left' : 'right'}`}>
      <span className="mermaid-popup-body">🧜‍♀️</span>
      {NOTES.map((n, i) => (
        <span
          key={i}
          className="mermaid-note"
          style={{
            left: '50%',
            top: '28%',
            '--note-x': `${n.x}px`,
            '--note-y': `${n.y}px`,
            '--note-rot': `${n.rot}deg`,
            animationDelay: `${n.delay}ms`,
          } as React.CSSProperties}
        >
          {i % 2 === 0 ? '🎵' : '🎶'}
        </span>
      ))}
    </div>
  );
}
