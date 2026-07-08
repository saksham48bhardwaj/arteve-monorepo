/**
 * Shared date/time display helpers.
 *
 * The DB stores `event_date` as YYYY-MM-DD and `event_time` as HH:MM[:SS]
 * (Postgres `time`). These helpers keep on-screen formatting consistent
 * across both apps.
 */

/** "21:30:00" → "9:30 PM" (locale-aware). Returns the input if unparseable. */
export function formatEventTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return time;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "2026-06-20" → "Jun 20, 2026" (en-US style used across the apps). */
export function formatEventDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** True once the local calendar day of `dateStr` has fully passed. */
export function isPastDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T23:59:59`);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

/** Compact relative timestamp for feed content: "now", "5m", "3h", "2d", "May 21". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
