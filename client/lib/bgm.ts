'use client';

// 배경음악(BGM) 전용 재생기 — 페이지/컴포넌트가 리마운트되어도 끊기지 않도록
// 모듈 스코프의 싱글턴 Audio 하나만 유지하며, 같은 곡이 이미 재생 중이면
// 볼륨만 갱신하고 처음부터 다시 틀지 않는다.
let audio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;
let retryBound = false;

function tryPlay() {
  if (!audio) return;
  audio.play().catch(() => {
    // 브라우저 자동재생 정책으로 막히면, 사용자의 첫 상호작용 시 한 번 재시도한다.
    if (retryBound) return;
    retryBound = true;
    const retry = () => {
      audio?.play().catch(() => {});
      document.removeEventListener('pointerdown', retry);
      document.removeEventListener('keydown', retry);
      retryBound = false;
    };
    document.addEventListener('pointerdown', retry, { once: true });
    document.addEventListener('keydown', retry, { once: true });
  });
}

export function playBgm(src: string, volume = 1) {
  if (typeof window === 'undefined') return;

  if (currentSrc === src) {
    if (audio) audio.volume = volume;
    return;
  }

  audio?.pause();
  const next = new Audio(src);
  next.loop = true;
  next.volume = volume;
  audio = next;
  currentSrc = src;
  tryPlay();
}

export function stopBgm() {
  audio?.pause();
  audio = null;
  currentSrc = null;
}
