'use client';

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

const TABS = [
  { key: 'people', label: 'People' },
  { key: 'gigs', label: 'Gigs' },
  { key: 'venues', label: 'Venues' },
  { key: 'posts', label: 'Posts' },
  { key: 'events', label: 'Events' },
];

type ResultType =
  | PersonResult[]
  | GigResult[]
  | VenueResult[]
  | PostResult[]
  | EventResult[]
  | [];

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

export default function FindPage() {
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

  // -------------------- Load musician ID --------------------
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setMusicianId(data.user?.id ?? null);
    }
    loadUser();
  }, []);

  // -------------------- Change tab --------------------
  const changeTab = (tab: string) => {
    router.push(`/find?tab=${tab}`);
    setResults([]);
    setPage(1);
    setHasMore(true);
  };

  // -------------------- Reset page when query/tab/filters change --------------------
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [query, currentTab, filters, musicianId]);

  // -------------------- Fetch results (with pagination) --------------------
  useEffect(() => {
    async function run() {
      const trimmed = query.trim();

      // For non-gig tabs, require a query to avoid massive fetch
      if (currentTab !== 'gigs' && trimmed === '') {
        setResults([]);
        setHasMore(false);
        return;
      }

      // For gigs, allow empty query (show all open gigs)
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

        const newResults = (data || []) as (PersonResult | GigResult | VenueResult | PostResult | EventResult)[];
        setResults((prev) =>
          page === 1 ? newResults : [...(prev as (PersonResult | GigResult | VenueResult | PostResult | EventResult)[]), ...newResults]
        );
        setHasMore(newResults.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }

    run();
  }, [page, query, currentTab, musicianId, filters]);

  // -------------------- Infinite scroll observer --------------------
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const el = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [hasMore, loading]);

  // -------------------- Helpers --------------------
  const handleFilterChange = (field: keyof GigFilters, value: string) => {
    setFilters((prev) => {
      if (field === 'minBudget' || field === 'maxBudget') {
        const num = value === '' ? null : Number(value);
        return { ...prev, [field]: isNaN(num as number) ? null : num };
      }
      return { ...prev, [field]: value };
    });
  };

  // -------------------- Render --------------------
  return (
    <div className="p-4 space-y-4">
      {/* Search Bar + Filter Button */}
      <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 gap-3">
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="text-gray-600"
          aria-label="Filters"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
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
          placeholder="Search..."
          className="flex-1 bg-transparent outline-none text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-1 rounded-full border ${
              currentTab === tab.key
                ? 'bg-black text-white'
                : 'bg-white text-gray-600'
            }`}
            onClick={() => changeTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading && page === 1 && <p>Loading...</p>}
        {!loading && results.length === 0 && (
          <p className="text-sm text-gray-500">No results found.</p>
        )}

        {results.map((item) => {
          if (currentTab === 'people') {
            const p = item as PersonResult;
            return (
              <div key={p.id} className="border-b pb-2">
                <div className="flex items-center gap-3">
                  <img
                    src={p.avatar_url || '/default-avatar.png'}
                    className="w-10 h-10 rounded-full"
                    alt={p.full_name}
                  />
                  <span className="font-medium">{p.full_name}</span>
                </div>
              </div>
            );
          }

          if (currentTab === 'gigs') {
            const g = item as GigResult;
            return (
              <div
                key={g.id}
                className="border-b pb-2 cursor-pointer"
                onClick={() => router.push(`/gigs/${g.id}`)}
              >
                <p className="font-medium">{g.title}</p>
                <p className="text-sm text-gray-500">
                  {g.location}
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
              <div key={v.id} className="border-b pb-2">
                <p className="font-medium">{v.venue_name || v.name}</p>
                <p className="text-sm text-gray-500">{v.location}</p>
              </div>
            );
          }

          if (currentTab === 'posts') {
            const p = item as PostResult;
            return (
              <div key={p.id} className="border-b pb-2">
                <p>{p.content || p.text}</p>
              </div>
            );
          }

          if (currentTab === 'events') {
            const e = item as EventResult;
            return (
              <div key={e.id} className="border-b pb-2">
                <p className="font-medium">{e.title}</p>
                <p className="text-sm text-gray-500">{e.location}</p>
              </div>
            );
          }

          return null;
        })}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="py-6 text-center text-gray-400 text-sm"
          >
            {loading ? 'Loading more...' : 'Scroll to load more'}
          </div>
        )}
      </div>

      {/* Filter Sheet (for gigs) */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/30 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="text-gray-500 text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm"
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange('location', e.target.value)
                  }
                  placeholder="City or area"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Genre (for gigs)
                </label>
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm"
                  value={filters.genre}
                  onChange={(e) => handleFilterChange('genre', e.target.value)}
                  placeholder="e.g. Rock, Jazz"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-1">
                    Min budget
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded p-2 text-sm"
                    value={filters.minBudget ?? ''}
                    onChange={(e) =>
                      handleFilterChange('minBudget', e.target.value)
                    }
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-1">
                    Max budget
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded p-2 text-sm"
                    value={filters.maxBudget ?? ''}
                    onChange={(e) =>
                      handleFilterChange('maxBudget', e.target.value)
                    }
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 border rounded py-2 text-sm"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear
              </button>
              <button
                type="button"
                className="flex-1 bg-black text-white rounded py-2 text-sm"
                onClick={() => {
                  setShowFilters(false);
                  setPage(1);
                  setResults([]);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
