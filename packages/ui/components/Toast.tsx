'use client';

import * as React from 'react';
import { cn } from './cn';

type Tone = 'default' | 'success' | 'danger' | 'warning';

export interface ToastOptions {
  /** Visible message. */
  message: string;
  /** Optional small leading title above the message. */
  title?: string;
  /** Color tone — defaults to dark ink. */
  tone?: Tone;
  /** Auto-dismiss after this many ms (default 4000). 0 = stick. */
  duration?: number;
  /** Optional inline action (e.g. "Undo"). */
  action?: { label: string; onClick: () => void };
}

interface ToastInstance extends ToastOptions {
  id: number;
  leaving?: boolean;
}

type Listener = (toasts: ToastInstance[]) => void;

let toasts: ToastInstance[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() { listeners.forEach((l) => l([...toasts])); }

function push(opts: ToastOptions) {
  const id = nextId++;
  const t: ToastInstance = { id, duration: 4000, tone: 'default', ...opts };
  toasts = [...toasts, t];
  emit();
  if (t.duration && t.duration > 0) {
    setTimeout(() => dismiss(id), t.duration);
  }
  return id;
}

function dismiss(id: number) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 180);
}

/** Imperative API — call from any client component. */
export const toast = {
  show: (message: string, opts: Omit<ToastOptions, 'message'> = {}) =>
    push({ message, ...opts }),
  success: (message: string, opts: Omit<ToastOptions, 'message' | 'tone'> = {}) =>
    push({ message, tone: 'success', ...opts }),
  error: (message: string, opts: Omit<ToastOptions, 'message' | 'tone'> = {}) =>
    push({ message, tone: 'danger', duration: 6000, ...opts }),
  warning: (message: string, opts: Omit<ToastOptions, 'message' | 'tone'> = {}) =>
    push({ message, tone: 'warning', ...opts }),
  dismiss,
};

/** Mount once at the root of your app (inside ClientShell). */
export function ToastViewport({ className }: { className?: string }) {
  const [items, setItems] = React.useState<ToastInstance[]>([]);
  React.useEffect(() => {
    const l: Listener = (next) => setItems(next);
    listeners.add(l);
    setItems([...toasts]);
    return () => { listeners.delete(l); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={cn('toast-viewport', className)} role="region" aria-label="Notifications">
      {items.map((t) => (
        <div
          key={t.id}
          className="toast"
          data-tone={t.tone}
          data-leaving={t.leaving ? 'true' : undefined}
          role={t.tone === 'danger' ? 'alert' : 'status'}
        >
          <ToneIcon tone={t.tone ?? 'default'} />
          <div className="min-w-0 flex-1">
            {t.title && <p className="font-semibold leading-tight">{t.title}</p>}
            <p className={cn(t.title && 'mt-0.5 opacity-90')}>{t.message}</p>
          </div>
          {t.action && (
            <button
              type="button"
              onClick={() => { t.action!.onClick(); dismiss(t.id); }}
              className="ml-2 text-[12px] font-semibold underline underline-offset-2 opacity-95 hover:opacity-100"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="toast-close inline-flex h-6 w-6 items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function ToneIcon({ tone }: { tone: Tone }) {
  const cls = 'h-4 w-4 shrink-0 mt-0.5 opacity-95';
  if (tone === 'success') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (tone === 'danger') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (tone === 'warning') {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return null;
}
