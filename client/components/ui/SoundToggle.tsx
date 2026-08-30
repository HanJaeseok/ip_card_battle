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
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
        active
          ? 'bg-jungle-700 text-white'
          : 'bg-gray-200 text-gray-400 line-through'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );
}

export function SoundToggle() {
  const [settings, setSettings] = useState<AudioSettings>(getAudioSettings());

  useEffect(() => subscribeAudioSettings(() => setSettings(getAudioSettings())), []);

  // 개별 버튼의 on/off 표시는 "전체"가 꺼져 있으면 실제로 소리가 안 나는 상태를
  // 그대로 반영해야 한다 — 안 그러면 전체를 꺼도 나머지 버튼은 계속 켜진 것처럼
  // 보여서 "안 꺼졌다"고 오해하게 된다. 전체가 꺼진 동안은 개별 토글도 잠가둔다.
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
        active={!settings.muteAll && !settings.muteSfx}
        disabled={settings.muteAll}
        onClick={() => setAudioSettings({ muteSfx: !settings.muteSfx })}
      />
      <ToggleButton
        label="BGM"
        active={!settings.muteAll && !settings.muteBgm}
        disabled={settings.muteAll}
        onClick={() => setAudioSettings({ muteBgm: !settings.muteBgm })}
      />
    </div>
  );
}
