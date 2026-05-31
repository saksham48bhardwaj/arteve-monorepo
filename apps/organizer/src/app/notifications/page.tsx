'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import {
  Avatar,
  Button,
  EmptyState,
  Spinner,
  usePullToRefresh,
  PullToRefreshIndicator,
} from '@arteve/ui/components';

type Notification = {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: string | null;
  entity_type: string | null;
  entity_id: number | string | null;
  created_at: string;
  read_at: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
};

type ActorProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
};

/* ---- copy + iconography for known notification types ---- */
const TYPE_META: Record<
  string,
  { defaultTitle: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'; icon: (cls: string) => React.ReactNode }
> = {
  gig_application: {
    defaultTitle: 'New application on your gig',
    tone: 'brand',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 11a7 7 0 0 1-14 0" /><path d="M12 18v4" />
      </svg>
    ),
  },
  application_status: {
    defaultTitle: 'Application update',
    tone: 'brand',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  gig_closed: {
    defaultTitle: 'Gig closed',
    tone: 'warning',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  booking_created: {
    defaultTitle: 'New booking',
    tone: 'success',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 3v4M15 3v4" /><path d="m8 14 3 3 5-5" />
      </svg>
    ),
  },
  new_message: {
    defaultTitle: 'New message',
    tone: 'brand',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
      </svg>
    ),
  },
  follow: {
    defaultTitle: 'New follower',
    tone: 'brand',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
      </svg>
    ),
  },
  like: {
    defaultTitle: 'New like',
    tone: 'danger',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" stroke="none">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  comment: {
    defaultTitle: 'New comment',
    tone: 'brand',
    icon: (cls) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
};

const TONE_BG: Record<string, string> = {
  brand:   'bg-brand-50 text-brand-700',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-danger/10 text-danger',
  neutral: 'bg-surface-sunken text-ink-muted',
};

function resolveLink(n: Notification): string {
  const d = (n.data ?? {}) as Record<string, string | number | undefined>;
  switch (n.type) {
    case 'gig_application':    return '/gigs?tab=applications';
    case 'application_status': return d.gig_id ? `/gigs/${d.gig_id}` : '/gigs?tab=applications';
    case 'gig_closed':         return d.gig_id ? `/gigs/${d.gig_id}` : '/notifications';
    case 'booking_created':    return d.booking_id ? `/bookings/${d.booking_id}` : '/gigs?tab=bookings';
    case 'new_message':        return d.conversation_id ? `/chat/${d.conversation_id}` : (d.booking_id ? `/bookings/${d.booking_id}/chat` : '/chat');
    case 'follow':             return d.actor_handle ? `/profile/${d.actor_handle}` : '/profile';
    case 'like':
    case 'comment':            return d.post_id ? `/?post=${d.post_id}` : '/';
    default:                   return '/notifications';
  }
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.round(day / 365)}y`;
}

function bucketize(items: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const sevenDaysAgo = startOfToday - 7 * 86_400_000;

  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  for (const n of items) {
    const t = new Date(n.created_at).getTime();
    if (t >= startOfToday) today.push(n);
    else if (t >= startOfYesterday) yesterday.push(n);
    else if (t >= sevenDaysAgo) thisWeek.push(n);
    else older.push(n);
  }

  const out: { label: string; items: Notification[] }[] = [];
  if (today.length) out.push({ label: 'Today', items: today });
  if (yesterday.length) out.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length) out.push({ label: 'This week', items: thisWeek });
  if (older.length) out.push({ label: 'Earlier', items: older });
  return out;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [actors, setActors] = useState<Record<string, ActorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    const list = (data ?? []) as Notification[];
    setItems(list);

    // Batch-fetch actor profiles
    const actorIds = Array.from(new Set(list.map((n) => n.actor_id).filter((id): id is string => !!id)));
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .in('id', actorIds);
      const map: Record<string, ActorProfile> = {};
      (profs ?? []).forEach((p) => { map[(p as ActorProfile).id] = p as ActorProfile; });
      setActors(map);
    }

    setLoading(false);
  }

  useEffect(() => { loadNotifications(); }, []);

  const pull = usePullToRefresh({ onRefresh: loadNotifications });

  async function markAsRead(id: number) {
    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now }).eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
  }

  async function markAllAsRead() {
    setMarking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMarking(false); return; }
    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now }).is('read_at', null).eq('user_id', user.id);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setMarking(false);
  }

  const filtered = useMemo(
    () => (showUnreadOnly ? items.filter((n) => !n.read_at) : items),
    [items, showUnreadOnly],
  );
  const groups = useMemo(() => bucketize(filtered), [filtered]);
  const unreadCount = items.filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="card card-padded flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-sm text-ink-muted">Loading notifications…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      <PullToRefreshIndicator {...pull} />
      {/* Filters + Mark-all in a single row (Notifications heading lives in TopNav) */}
      <div className="px-4 md:px-6 pt-4 pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUnreadOnly(false)}
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition ${!showUnreadOnly ? 'bg-brand text-white' : 'border border-line-strong text-ink-muted hover:bg-surface-sunken hover:text-ink'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setShowUnreadOnly(true)}
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition ${showUnreadOnly ? 'bg-brand text-white' : 'border border-line-strong text-ink-muted hover:bg-surface-sunken hover:text-ink'}`}
          >
            Unread {unreadCount > 0 && <span className="ml-1.5 tabular text-[11px] opacity-90">{unreadCount}</span>}
          </button>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" loading={marking} onClick={markAllAsRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="px-4 md:px-6 mt-2">
          <EmptyState
            title={showUnreadOnly ? "You're all caught up" : 'No notifications yet'}
            description={showUnreadOnly ? 'Switch to All to see your earlier notifications.' : 'Updates about your gigs, bookings, and activity will show up here.'}
          />
        </div>
      ) : (
        <div className="pb-8">
          {groups.map((g) => (
            <section key={g.label} className="mt-1">
              <h2 className="px-4 md:px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle bg-surface-muted/60">
                {g.label}
              </h2>
              <ul className="divide-y divide-line border-y border-line bg-surface">
                {g.items.map((n) => {
                  const meta = TYPE_META[n.type ?? ''] ?? {
                    defaultTitle: 'New activity',
                    tone: 'neutral' as const,
                    icon: (cls: string) => (
                      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" />
                        <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
                      </svg>
                    ),
                  };
                  const actor = n.actor_id ? actors[n.actor_id] : undefined;
                  const isUnread = !n.read_at;
                  return (
                    <li key={n.id}>
                      <Link
                        href={`${resolveLink(n)}${resolveLink(n).includes('?') ? '&' : '?'}notification_id=${n.id}`}
                        onClick={() => isUnread && markAsRead(n.id)}
                        className={`flex items-start gap-3 px-4 md:px-6 py-3.5 transition ${isUnread ? 'bg-brand-50/35 hover:bg-brand-50/65' : 'hover:bg-surface-sunken/60'}`}
                      >
                        {/* Actor avatar OR type-tinted icon */}
                        {actor ? (
                          <div className="relative shrink-0">
                            <Avatar src={actor.avatar_url} alt={actor.display_name ?? ''} size="md" />
                            <span className={`absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full ${TONE_BG[meta.tone]} ring-2 ring-surface`}>
                              {meta.icon('h-3 w-3')}
                            </span>
                          </div>
                        ) : (
                          <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full ${TONE_BG[meta.tone]}`}>
                            {meta.icon('h-5 w-5')}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">
                            {actor && (
                              <span className="font-semibold text-ink-strong">{actor.display_name ?? `@${actor.handle ?? 'user'}`}</span>
                            )}
                            {actor ? ' ' : null}
                            <span className={isUnread ? 'text-ink-strong font-medium' : 'text-ink'}>
                              {n.title || meta.defaultTitle}
                            </span>
                          </p>
                          {n.body && (
                            <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                          <p className="text-[11px] text-ink-subtle mt-1">{relativeTime(n.created_at)}</p>
                        </div>

                        {isUnread && (
                          <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
