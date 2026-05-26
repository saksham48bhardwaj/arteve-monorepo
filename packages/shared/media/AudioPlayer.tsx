'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  /** Optional caption above the player. */
  title?: string;
  className?: string;
};

/**
 * Lightweight audio player with a generated stylized waveform.
 * Renders a series of vertical bars whose height is derived from
 * a hash of the URL — purely cosmetic but stable per-track.
 * (Real waveform analysis would require decoding the audio
 * with Web Audio, which is heavy for a feed view.)
 */
export function AudioPlayer({ src, title, className = '' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      if (!el.duration) return;
      setProgress(el.currentTime / el.duration);
    };
    const onLoaded = () => setDuration(el.duration);
    const onEnded = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
    };
  }, [src]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function seek(pct: number) {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    el.currentTime = pct * el.duration;
    setProgress(pct);
  }

  // Stable pseudo-random bars from the URL.
  const bars = makeBars(src, 60);

  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {title && (
        <p className="mb-2 text-sm font-medium text-ink-strong">{title}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-strong text-white text-sm"
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <button
          type="button"
          className="relative flex-1 h-10 cursor-pointer"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(Math.max(0, Math.min(1, pct)));
          }}
        >
          <div className="absolute inset-0 flex items-center justify-between gap-[2px]">
            {bars.map((h, i) => {
              const filled = i / bars.length <= progress;
              return (
                <span
                  key={i}
                  style={{ height: `${h * 100}%` }}
                  className={`w-[3px] rounded-full ${filled ? 'bg-brand' : 'bg-line-strong'}`}
                />
              );
            })}
          </div>
        </button>

        <span className="w-12 text-right text-xs tabular-nums text-ink-subtle">
          {formatTime(duration * progress)} / {formatTime(duration)}
        </span>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

function makeBars(seed: string, count: number): number[] {
  const out: number[] = [];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const v = ((h >>> 0) % 100) / 100;
    out.push(0.3 + v * 0.7); // bars at 30-100% height
  }
  return out;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
