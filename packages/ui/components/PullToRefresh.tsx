'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

// --------------------------------------------------------------
// usePullToRefresh — listens to window touch events, fires onRefresh
// when the user pulls down past the threshold at scrollTop === 0.
// Use this hook plus <PullToRefreshIndicator /> for a complete pull-to-refresh setup,
// or roll your own indicator with the returned state.
// --------------------------------------------------------------

interface PullState {
  pullDistance: number;
  refreshing: boolean;
  /** 0 → 1+ depending on how far past threshold the user pulled */
  progress: number;
  threshold: number;
}

interface Options {
  onRefresh: () => Promise<unknown> | unknown;
  /** Pixels of pull needed before a release triggers refresh. Default 70. */
  threshold?: number;
  /** Disable engagement (e.g. when a modal is open). */
  enabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 70, enabled = true }: Options): PullState {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Always call the latest onRefresh without re-binding listeners
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      const top = window.scrollY || document.documentElement.scrollTop;
      if (top > 0) return;
      // Skip touches that start near the screen edges so iOS swipe-back
      // (and the right-edge forward gesture, if any) isn't shadowed by
      // the pull-to-refresh listener.
      const x = e.touches[0].clientX;
      if (x < 24 || x > window.innerWidth - 24) return;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        distanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      // Rubber-band: half-speed pull, soft cap above threshold
      const d = Math.min(dy * 0.5, threshold * 1.6);
      distanceRef.current = d;
      setPullDistance(d);
    }

    async function onTouchEnd() {
      if (startY.current === null) return;
      const finalDist = distanceRef.current;
      startY.current = null;
      distanceRef.current = 0;
      setPullDistance(0);
      if (finalDist >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
        }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, threshold]);

  const progress = Math.min(pullDistance / threshold, 1);
  return { pullDistance, refreshing, progress, threshold };
}

// --------------------------------------------------------------
// <PullToRefreshIndicator /> — fixed-position circular spinner that
// translates down with the pull and spins while refreshing.
// --------------------------------------------------------------

export interface PullToRefreshIndicatorProps extends PullState {
  className?: string;
}

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  progress,
  className,
}: PullToRefreshIndicatorProps) {
  const visible = pullDistance > 4 || refreshing;
  const offset = refreshing ? 24 : Math.max(0, pullDistance - 8);
  return (
    <div
      className={
        'fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-opacity duration-150 ' +
        (className ?? '')
      }
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden={!visible}
    >
      <div
        className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface shadow-sm"
        style={{
          transform: `translateY(${offset}px)`,
          transition: refreshing ? 'transform 0.15s ease' : undefined,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className={'h-5 w-5 text-brand ' + (refreshing ? 'animate-spin' : '')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
            transition: refreshing ? undefined : 'transform 80ms ease',
          }}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 4 21 12 13 12" />
        </svg>
      </div>
    </div>
  );
}

// --------------------------------------------------------------
// <PullToRefresh> — convenience wrapper: drop it around any page.
// --------------------------------------------------------------

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | unknown;
  children: React.ReactNode;
  threshold?: number;
  enabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, threshold, enabled }: PullToRefreshProps) {
  const state = usePullToRefresh({ onRefresh, threshold, enabled });
  return (
    <>
      <PullToRefreshIndicator {...state} />
      {children}
    </>
  );
}
