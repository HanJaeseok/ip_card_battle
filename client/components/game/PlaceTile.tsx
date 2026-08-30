'use client';

import type { Place } from 'shared';

export function PlaceTile({
  place,
  disabled,
  onClick,
  showBombWarning,
}: {
  place: Place;
  disabled: boolean;
  onClick: (place: Place) => void;
  showBombWarning: boolean;
}) {
  return (
    <button
      data-place-key={place}
      onClick={() => !disabled && onClick(place)}
      disabled={disabled}
      className={`place-tile relative w-full h-full rounded-2xl overflow-hidden select-none ${
        disabled ? 'place-tile-disabled' : 'place-tile-active cursor-pointer'
      }`}
      style={{ backgroundImage: `url(/places/${place}.png)` }}
    >
      {showBombWarning && (
        <span className="absolute top-1.5 right-1.5 text-lg drop-shadow" title="도토리 폭탄이 등장할 수 있습니다">
          🌰
        </span>
      )}
    </button>
  );
}
