'use client';

import { useEffect, useState } from 'react';
import {
  getAudioSettings,
  setAudioSettings,
  subscribeAudioSettings,
  type AudioSettings,
} from '@/lib/audioSettings';

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
        active
          ? 'bg-jungle-700 text-white'
          : 'bg-gray-200 text-gray-400 line-through'
      }`}
    >
      {label}
    </button>
  );
}

export function SoundToggle() {
  const [settings, setSettings] = useState<AudioSettings>(getAudioSettings());

  useEffect(() => subscribeAudioSettings(() => setSettings(getAudioSettings())), []);

  return (
    <div className="fixed bottom-3 right-3 z-[90] flex items-center gap-1.5 bg-white/90 backdrop-blur px-2.5 py-2 rounded-full shadow-lg border border-jungle-200">
      <span className="text-sm mr-0.5">{settings.muteAll ? '🔇' : '🔊'}</span>
      <ToggleButton
        label="전체"
        active={!settings.muteAll}
        onClick={() => setAudioSettings({ muteAll: !settings.muteAll })}
      />
      <ToggleButton
        label="효과음"
        active={!settings.muteSfx}
        onClick={() => setAudioSettings({ muteSfx: !settings.muteSfx })}
      />
      <ToggleButton
        label="BGM"
        active={!settings.muteBgm}
        onClick={() => setAudioSettings({ muteBgm: !settings.muteBgm })}
      />
    </div>
  );
}
