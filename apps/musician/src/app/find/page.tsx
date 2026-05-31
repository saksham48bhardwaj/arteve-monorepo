'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import {
  searchPeople,
  searchGigs,
  searchVenues,
  searchPosts,
  searchEvents,
  type PersonResult,
  type GigResult,
  type VenueResult,
  type PostResult,
  type EventResult,
  PAGE_SIZE,
} from '@/lib/find-queries';
import { Avatar, SafeImage, Spinner } from '@arteve/ui/components';

// ---- Tabs ----
type Tab = 'people' | 'gigs' | 'venues' | 'posts' | 'events';
const TABS: { value: Tab; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'gigs', label: 'Gigs' },
  { value: 'venues', label: 'Venues' },
  { value: 'posts', label: 'Posts' },
  { value: 'events', label: 'Events' },
];

type RecentItem =
  | { kind: 'profile'; id: string; name: string; handle: string; avatar: string | null; verified?: boolean }
  | { kind: 'query'; text: string };

const RECENTS_KEY = 'arteve.musician.find.recents';
const MAX_RECENTS = 10;

function loadRecents(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function saveRecents(items: RecentItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore quota errors */
  }
}

// Web Speech API — minimal types (browser-specific, not in lib.dom.d.ts globals)
interface SRResult { 0: { transcript: string } }
interface SREvent { results: ArrayLike<SRResult> }
interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SRCtor = new () => SRInstance;
declare global {
  interface Window {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  }
}

export default function FindPageWrapper() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-6">
          <div className="flex items-center gap-3 text-sm text-ink-subtle">
            <Spinner size={14} /> Loading…
          </div>
        </main>
      }
    >
      <FindPageContent />
    </Suspense>
  );
}

function FindPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const initialTab = (searchParams.get('tab') as Tab) || 'people';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Debounce the text query so we don't fire a PostgREST round-trip per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Search results
  const [results, setResults] = useState<unknown[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Pre-search state
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [suggestions, setSuggestions] = useState<PersonResult[]>([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const hasActiveFilters = Boolean(filterLocation.trim() || filterGenre.trim());

  // Auth (needed for /gigs search)
  const [musicianId, setMusicianId] = useState<string | null>(null);

  // Voice input
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef<SRInstance | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load auth + recents + suggestions
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMusicianId(data.user?.id ?? null);
    })();
    setRecents(loadRecents());

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('handle, display_name, avatar_url, location, genres, role')
        .in('role', ['musician', 'organizer'])
        .not('handle', 'is', null)
        .limit(8);
      setSuggestions((data ?? []) as unknown as PersonResult[]);
    })();
  }, []);

  // Reset paging when search/tab/auth/filters change
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [debouncedQuery, activeTab, musicianId, filterLocation, filterGenre]);

  // Run search
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const filters = { location: filterLocation.trim() || undefined, genre: filterGenre.trim() || undefined };
    const filtersActive = Boolean(filters.location || filters.genre);

    // Nothing to do when there's neither a query nor an active filter
    if (!trimmed && !filtersActive) {
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        let data: unknown[] = [];
        switch (activeTab) {
          case 'people':
            data = await searchPeople(trimmed, page, filters);
            break;
          case 'gigs':
            if (!musicianId) { data = []; break; }
            data = await searchGigs(trimmed, musicianId, { location: filters.location, genre: filters.genre }, page);
            break;
          case 'venues':
            data = await searchVenues(trimmed, page, { location: filters.location });
            break;
          case 'posts':
            data = await searchPosts(trimmed, page);
            break;
          case 'events':
            data = await searchEvents(trimmed, page);
            break;
        }
        if (cancelled) return;
        setResults((prev) => (page === 1 ? data : [...prev, ...data]));
        setHasMore(data.length === PAGE_SIZE);
      } catch (e) {
        console.error('[find] search error', e);
        if (!cancelled) {
          setResults([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedQuery, activeTab, page, musicianId, filterLocation, filterGenre]);

  // Recents helpers
  const pushRecent = useCallback((item: RecentItem) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => {
        if (item.kind === 'profile' && r.kind === 'profile') return r.id !== item.id;
        if (item.kind === 'query' && r.kind === 'query') return r.text.toLowerCase() !== item.text.toLowerCase();
        return true;
      });
      const next = [item, ...filtered].slice(0, MAX_RECENTS);
      saveRecents(next);
      return next;
    });
  }, []);

  function removeRecent(idx: number) {
    setRecents((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveRecents(next);
      return next;
    });
  }
  function clearAllRecents() {
    setRecents([]);
    saveRecents([]);
  }

  const commitQuery = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    pushRecent({ kind: 'query', text: t });
  }, [pushRecent]);

  // Voice input
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: SREvent) => {
      const text = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ').trim();
      setQuery(text);
    };
    rec.onend = () => setVoiceListening(false);
    rec.onerror = () => setVoiceListening(false);
    recognitionRef.current = rec;
  }, []);

  function toggleVoice() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (voiceListening) {
      rec.stop();
      setVoiceListening(false);
    } else {
      try { rec.start(); setVoiceListening(true); }
      catch { /* already started */ }
    }
  }

  const isSearching = query.trim().length > 0 || hasActiveFilters;
  const hasVoice =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  function handleProfileClick(item: {
    id?: string;
    handle: string;
    display_name?: string | null;
    avatar_url?: string | null;
  }) {
    if (item.handle) {
      pushRecent({
        kind: 'profile',
        id: item.id ?? item.handle,
        name: item.display_name ?? item.handle,
        handle: item.handle,
        avatar: item.avatar_url ?? null,
      });
      router.push(`/profile/${item.handle}`);
    }
  }

  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      {/* SEARCH BAR */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 px-3 py-2.5 border-b border-line">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <form
            onSubmit={(e) => { e.preventDefault(); commitQuery(query); inputRef.current?.blur(); }}
            className="flex-1 relative"
          >
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              autoFocus
              className="w-full rounded-full bg-surface-sunken pl-9 pr-11 py-2.5 text-sm text-ink-strong outline-none focus:ring-2 focus:ring-brand-200 focus:bg-surface transition"
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-surface hover:text-ink transition"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
              {hasVoice && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label={voiceListening ? 'Stop listening' : 'Voice search'}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
                    voiceListening ? 'bg-danger text-white animate-pulse' : 'text-ink-subtle hover:bg-surface hover:text-ink'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <path d="M12 18v4" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* TABS (only when searching) */}
      {isSearching && (
        <div className="sticky top-[58px] z-20 bg-surface/95 backdrop-blur border-b border-line">
          <div className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto scroll-smooth">
            <button
              type="button"
              aria-label="Filters"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={`relative shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                showFilters || hasActiveFilters
                  ? 'bg-ink-strong text-white'
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
              title="Filters"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
              </svg>
              {hasActiveFilters && !showFilters && (
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-surface" />
              )}
            </button>
            {TABS.map((t) => {
              const active = t.value === activeTab;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setActiveTab(t.value)}
                  className={`shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-brand text-white shadow-sm'
                      : 'border border-line-strong text-ink-muted hover:bg-surface-sunken hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-line">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Location</label>
                <input
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition"
                />
              </div>

              {(activeTab === 'people' || activeTab === 'gigs') && (
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">Genre</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Folk', 'R&B', 'Indie', 'Acoustic'].map((g) => {
                      const on = filterGenre === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFilterGenre(on ? '' : g)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                            on ? 'bg-ink-strong text-white border-ink-strong' : 'bg-surface text-ink-muted border-line hover:border-line-strong'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setFilterLocation(''); setFilterGenre(''); }}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENT */}
      <div className="px-4 md:px-6 pt-4 pb-8">
        {!isSearching ? (
          <PreSearch
            recents={recents}
            suggestions={suggestions}
            onRecentRemove={removeRecent}
            onClearAll={clearAllRecents}
            onPickProfile={handleProfileClick}
            onPickSuggestion={(text) => { setQuery(text); pushRecent({ kind: 'query', text }); }}
          />
        ) : (
          <SearchResults
            tab={activeTab}
            loading={loading}
            results={results}
            onLoadMore={() => hasMore && !loading && setPage((p) => p + 1)}
            hasMore={hasMore}
            onProfileClick={handleProfileClick}
          />
        )}
      </div>
    </main>
  );
}

/* ============================================================
   PRE-SEARCH (empty query state)
   ============================================================ */
function PreSearch({
  recents,
  suggestions,
  onRecentRemove,
  onClearAll,
  onPickProfile,
  onPickSuggestion,
}: {
  recents: RecentItem[];
  suggestions: PersonResult[];
  onRecentRemove: (idx: number) => void;
  onClearAll: () => void;
  onPickProfile: (item: { id?: string; handle: string; display_name?: string | null; avatar_url?: string | null }) => void;
  onPickSuggestion: (text: string) => void;
}) {
  return (
    <>
      {recents.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-ink-strong">Recent</h2>
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-0">
            {recents.map((r, i) => (
              <li key={`${r.kind}-${i}`} className="flex items-center gap-3 py-2">
                {r.kind === 'profile' ? (
                  <button
                    type="button"
                    onClick={() => onPickProfile({ handle: r.handle, display_name: r.name, avatar_url: r.avatar })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar src={r.avatar} alt={r.name} size="md" />
                    <span className="text-sm font-semibold text-ink-strong truncate flex items-center gap-1.5">
                      {r.name}
                      {r.verified && <VerifiedBadge />}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPickSuggestion(r.text)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                      </svg>
                    </span>
                    <span className="text-sm text-ink-strong truncate">{r.text}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRecentRemove(i)}
                  aria-label="Remove from recent"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-subtle hover:bg-surface-sunken hover:text-ink transition"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-base font-bold text-ink-strong mb-3">Try searching for</h2>
        {suggestions.length === 0 ? (
          <p className="text-sm text-ink-subtle">Nothing to suggest yet — try a name or a city.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.handle}
                type="button"
                onClick={() => onPickProfile({ id: s.handle, handle: s.handle, display_name: s.display_name, avatar_url: s.avatar_url })}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface pl-1 pr-3.5 py-1 text-sm font-medium text-ink-strong hover:bg-surface-sunken hover:border-ink-disabled transition"
              >
                {s.avatar_url ? (
                  <Image src={s.avatar_url} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" /><path d="M6 20a6 6 0 0 1 12 0" />
                    </svg>
                  </span>
                )}
                {s.display_name ?? s.handle}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ============================================================
   SEARCH RESULTS
   ============================================================ */
function SearchResults({
  tab,
  results,
  loading,
  hasMore,
  onLoadMore,
  onProfileClick,
}: {
  tab: Tab;
  results: unknown[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onProfileClick: (item: { id?: string; handle: string; display_name?: string | null; avatar_url?: string | null }) => void;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) onLoadMore(); },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore]);

  if (loading && results.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="text-sm text-ink-subtle text-center py-12">No results.</p>;
  }

  return (
    <>
      {tab === 'people' && (
        <ul className="space-y-0">
          {(results as PersonResult[]).map((p) => (
            <li key={p.handle}>
              <button
                type="button"
                onClick={() => onProfileClick({ handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url })}
                className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-surface-sunken/60 rounded-lg px-1 transition"
              >
                <Avatar src={p.avatar_url} alt={p.display_name ?? p.handle} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-strong truncate">
                    {p.display_name ?? p.handle}
                    <VerifiedBadge />
                  </p>
                  {p.location && <p className="text-xs text-ink-subtle truncate">{p.location}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'venues' && (
        <ul className="space-y-0">
          {(results as VenueResult[]).map((v) => (
            <li key={v.handle}>
              <button
                type="button"
                onClick={() => onProfileClick({ id: v.id, handle: v.handle, display_name: v.display_name, avatar_url: v.avatar_url })}
                className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-surface-sunken/60 rounded-lg px-1 transition"
              >
                <Avatar src={v.avatar_url} alt={v.display_name ?? v.handle} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-strong truncate">{v.display_name ?? v.handle}</p>
                  {v.location && <p className="text-xs text-ink-subtle truncate">{v.location}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'gigs' && (
        <ul className="space-y-2">
          {(results as GigResult[]).map((g) => (
            <li key={g.id}>
              <Link href={`/gigs/${g.id}`} className="block card card-padded card-hover">
                <p className="text-sm font-semibold text-ink-strong">{g.title}</p>
                <div className="mt-1 text-xs text-ink-muted flex items-center gap-3 flex-wrap">
                  {g.location && <span>{g.location}</span>}
                  {g.event_date && <span>{new Date(g.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {(g.budget_min || g.budget_max) && (
                    <span className="tabular">${g.budget_min ?? 0}{g.budget_max ? `–${g.budget_max}` : '+'}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === 'posts' && (
        <div className="grid grid-cols-3 gap-[2px]">
          {(results as PostResult[]).map((post) => (
            <div key={post.id} className="relative w-full pb-[100%] overflow-hidden bg-surface-sunken">
              <SafeImage
                src={post.media_url}
                alt={post.caption ?? ''}
                fill
                sizes="(max-width: 640px) 33vw, 240px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'events' && (
        <ul className="space-y-2">
          {(results as EventResult[]).map((ev) => (
            <li key={ev.id} className="card card-padded card-hover flex items-center gap-3">
              {ev.image_url && (
                <Image
                  src={ev.image_url}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-strong truncate">{ev.title}</p>
                {ev.location && <p className="text-xs text-ink-subtle truncate">{ev.location}</p>}
              </div>
              {ev.date && <p className="text-xs text-ink-subtle tabular shrink-0">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>}
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinel} className="py-6 flex items-center justify-center text-xs text-ink-subtle">
        {loading && results.length > 0 ? <Spinner size={14} /> : !hasMore ? '— end —' : null}
      </div>
    </>
  );
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand shrink-0" fill="currentColor" aria-label="Verified">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.06 14.54L6.4 12l1.41-1.41 3.13 3.12 6.25-6.25L18.6 8.87l-7.66 7.67z" />
    </svg>
  );
}
