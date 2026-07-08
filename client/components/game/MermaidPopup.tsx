import type { Team } from 'shared';

const NOTES = [
  { x: -50, y: -100, rot: -20, delay: 250 },
  { x: 25, y: -135, rot: 15, delay: 420 },
  { x: 70, y: -80, rot: 25, delay: 600 },
  { x: -20, y: -145, rot: -10, delay: 780 },
  { x: 50, y: -110, rot: 10, delay: 950 },
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
            top: '35%',
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
