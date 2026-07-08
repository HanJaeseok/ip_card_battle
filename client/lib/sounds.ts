'use client';

type SoundAnimal = 'sheep' | 'mermaid' | 'tiger' | 'rabbit';

type Manifest = Record<SoundAnimal, string[]>;

const EMPTY_MANIFEST: Manifest = { sheep: [], mermaid: [], tiger: [], rabbit: [] };

let manifest: Manifest = EMPTY_MANIFEST;
const audioCache = new Map<string, HTMLAudioElement>();

function loadManifest(): void {
  fetch('/api/sounds')
    .then(res => (res.ok ? res.json() : null))
    .then((data: Manifest | null) => {
      if (!data) return;
      manifest = data;
      Object.values(data)
        .flat()
        .forEach(src => {
          const audio = new Audio(src);
          audio.preload = 'auto';
          audioCache.set(src, audio);
        });
    })
    .catch(() => {});
}

if (typeof window !== 'undefined') {
  loadManifest();
}

function playSrc(src: string) {
  const base = audioCache.get(src);
  const audio = base ? (base.cloneNode(true) as HTMLAudioElement) : new Audio(src);
  audio.play().catch(() => {});
}

export function playRandomSound(animal: SoundAnimal) {
  const files = manifest[animal];
  if (!files || files.length === 0) return;
  const src = files[Math.floor(Math.random() * files.length)];
  playSrc(src);
}

export function playRandomSoundSequence(animal: SoundAnimal, count: number, intervalMs = 150) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => playRandomSound(animal), i * intervalMs);
  }
}

export function playFixedSound(src: string) {
  const audio = new Audio(src);
  audio.play().catch(() => {});
}
