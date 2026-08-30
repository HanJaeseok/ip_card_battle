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
      {/* 장소 설명 라벨 — object-contain으로 타일 너비/높이에 맞춰 함께 축소·확대된다 */}
      <img
        src={`/places/${place}_text.png`}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
      />

      {showBombWarning && (
        <span className="absolute top-1.5 right-1.5 text-lg drop-shadow" title="도토리 폭탄이 등장할 수 있습니다">
          🌰
        </span>
      )}
    </button>
  );
}
