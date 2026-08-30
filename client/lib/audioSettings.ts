'use client';

// 사운드 on/off 설정 — 전체(마스터)/효과음/BGM을 각각 끌 수 있다.
// 게임 세션(sessionStorage)이 아니라 기기 단위 취향이므로 localStorage에 저장한다.
export interface AudioSettings {
  muteAll: boolean;
  muteSfx: boolean;
  muteBgm: boolean;
}

const STORAGE_KEY = 'cardBattle_audioSettings';
const DEFAULTS: AudioSettings = { muteAll: false, muteSfx: false, muteBgm: false };

let settings: AudioSettings = { ...DEFAULTS };
const listeners = new Set<() => void>();

function load() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // 손상된 값은 무시하고 기본값 사용
  }
}
load();

export function getAudioSettings(): AudioSettings {
  return settings;
}

export function setAudioSettings(patch: Partial<AudioSettings>): void {
  settings = { ...settings, ...patch };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
  listeners.forEach(fn => fn());
}

export function subscribeAudioSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isSfxMuted(): boolean {
  return settings.muteAll || settings.muteSfx;
}

export function isBgmMuted(): boolean {
  return settings.muteAll || settings.muteBgm;
}
