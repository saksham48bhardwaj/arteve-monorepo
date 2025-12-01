'use client';

import { Suspense } from 'react';

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@arteve/supabase/client';

import {
  searchPeople,
  searchGigs,
  searchVenues,
  searchPosts,
  searchEvents,
  PersonResult,
  GigResult,
  VenueResult,
  PostResult,
  EventResult,
  PAGE_SIZE,
} from '@/lib/find-queries';

// -------------------------------------------
// Wrapper Component (Suspense)
// -------------------------------------------
export default function FindPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <FindPageContent />
    </Suspense>
  );
}

// -------------------------------------------
// Main Find Page Component
// -------------------------------------------
function FindPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get('tab') || 'people';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultType>([]);
  const [loading, setLoading] = useState(false);
  const [musicianId, setMusicianId] = useState<string | null>(null);

  const [filters, setFilters] = useState<GigFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* -------------------- Load user (musician ID) -------------------- */
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setMusicianId(data.user?.id ?? null);
    }
    loadUser();
  }, []);

  /* -------------------- Tab Change -------------------- */
  const changeTab = (tab: string) => {
    router.push(`/find?tab=${tab}`);
    setResults([]);
    setPage(1);
    setHasMore(true);
    setQuery('');
  };

  /* -------------------- Reset pagination when filters change -------------------- */
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [query, currentTab, filters, musicianId]);

  /* -------------------- Fetch Results -------------------- */
  useEffect(() => {
    async function run() {
      const trimmed = query.trim();

      // For non-gigs, avoid empty search fetch
      if (currentTab !== 'gigs' && trimmed === '') {
        setResults([]);
        setHasMore(false);
        return;
      }

      if (currentTab === 'gigs' && !musicianId) return;

      setLoading(true);

      try {
        let data: ResultType = [];

        if (currentTab === 'people') {
          data = await searchPeople(trimmed, page);
        } else if (currentTab === 'gigs' && musicianId) {
          data = await searchGigs(trimmed, musicianId, filters, page);
        } else if (currentTab === 'venues') {
          data = await searchVenues(trimmed, page);
        } else if (currentTab === 'posts') {
          data = await searchPosts(trimmed, page);
        } else if (currentTab === 'events') {
          data = await searchEvents(trimmed, page);
        }

        const newResults: ResultType = (data || []);
        setResults((prev) =>
          page === 1 ? newResults : [...prev, ...newResults]
        );
        setHasMore(newResults.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }

    run();
  }, [page, query, currentTab, musicianId, filters]);

  /* -------------------- Infinite Scroll -------------------- */
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  /* -------------------- Filter Helper -------------------- */
  const handleFilterChange = (field: keyof GigFilters, value: string) => {
    setFilters((prev) => {
      if (field === 'minBudget' || field === 'maxBudget') {
        const num = value === '' ? null : Number(value);
        return { ...prev, [field]: num === null || isNaN(num) ? null : num };
      }
      return { ...prev, [field]: value };
    });
  };

  /* -------------------- Render -------------------- */
  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 bg-white">

      {/* -------------------- Search Bar -------------------- */}
      <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 gap-3 shadow-sm">
        <button
          onClick={() => setShowFilters(true)}
          className="text-gray-600 hover:text-black transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M4 7h16M7 12h10M10 17h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <input
          type="text"
          placeholder="Search anything…"
          className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* -------------------- Tabs -------------------- */}
      <div className="flex gap-6 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-hide">

        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`pb-2 text-base font-medium tracking-tight transition ${
              currentTab === t.key
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}

      </div>

      {/* -------------------- Results -------------------- */}
      <section className="space-y-4">

        {loading && page === 1 && (
          <p className="text-sm text-gray-500">Loading…</p>
        )}

        {!loading && results.length === 0 && (
          <p className="text-sm text-gray-500 pt-4 text-center">
            No results found.
          </p>
        )}

        {/* Each card type is now styled consistently */}
        {results.map((item) => {
          if (currentTab === 'people') {
            const p = item as PersonResult;
            return (
              <div
                key={p.handle}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => router.push(`/profile/${p.handle}`)}
              >
                <img
                  src={p.avatar_url || '/default-avatar.png'}
                  className="w-12 h-12 rounded-2xl object-cover border"
                />
                <div>
                  <p className="font-medium">{p.display_name}</p>
                </div>
              </div>
            );
          }

          if (currentTab === 'gigs') {
            const g = item as GigResult;
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => router.push(`/gigs/${g.id}`)}
              >
                <p className="font-semibold text-gray-900">{g.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {g.location ?? 'Unknown location'}
                  {g.budget_min != null && g.budget_max != null && (
                    <> · ${g.budget_min}–${g.budget_max}</>
                  )}
                </p>
              </div>
            );
          }

          if (currentTab === 'venues') {
            const v = item as VenueResult;
            return (
              <div
                key={v.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:bg-gray-50 transition"
              >
                <p className="font-semibold">{v.display_name ?? 'Unknown Venue'}</p>
                <p className="text-sm text-gray-600">{v.location}</p>
              </div>
            );
          }

          if (currentTab === 'posts') {
            const p = item as PostResult;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:bg-gray-50 transition"
              >
                <p className="text-gray-800">{p.content || p.text}</p>
              </div>
            );
          }

          if (currentTab === 'events') {
            const ev = item as EventResult;
            return (
              <div
                key={ev.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:bg-gray-50 transition"
              >
                <p className="font-semibold">{ev.title}</p>
                <p className="text-sm text-gray-600">{ev.location}</p>
              </div>
            );
          }

          return null;
        })}

        {hasMore && (
          <div
            ref={loadMoreRef}
            className="py-6 text-center text-gray-400 text-sm"
          >
            {loading ? 'Loading more...' : ''}
          </div>
        )}
      </section>

      {/* -------------------- Filter Sheet -------------------- */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-6 shadow-xl">

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="City or area"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2"
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange('location', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre
                </label>
                <input
                  type="text"
                  placeholder="Rock, Jazz, Pop…"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2"
                  value={filters.genre}
                  onChange={(e) =>
                    handleFilterChange('genre', e.target.value)
                  }
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Budget
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2"
                    value={filters.minBudget ?? ''}
                    onChange={(e) =>
                      handleFilterChange('minBudget', e.target.value)
                    }
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Budget
                  </label>
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2"
                    value={filters.maxBudget ?? ''}
                    onChange={(e) =>
                      handleFilterChange('maxBudget', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 border border-gray-300 rounded-xl py-2 text-sm"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear
              </button>
              <button
                className="flex-1 bg-black text-white rounded-xl py-2 text-sm"
                onClick={() => {
                  setShowFilters(false);
                  setPage(1);
                  setResults([]);
                }}
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------- Tabs -------------------- */
const TABS = [
  { key: 'people', label: 'People' },
  { key: 'gigs', label: 'Gigs' },
  { key: 'venues', label: 'Venues' },
  { key: 'posts', label: 'Posts' },
  { key: 'events', label: 'Events' },
];

/* -------------------- Types -------------------- */
type ResultItem = PersonResult | GigResult | VenueResult | PostResult | EventResult;
type ResultType = ResultItem[];

type GigFilters = {
  location: string;
  genre: string;
  minBudget: number | null;
  maxBudget: number | null;
};

const DEFAULT_FILTERS: GigFilters = {
  location: '',
  genre: '',
  minBudget: null,
  maxBudget: null,
};
