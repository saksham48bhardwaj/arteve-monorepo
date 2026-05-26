'use client';

import { Suspense } from 'react';
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { searchPeople, PersonResult, PersonFilters, PAGE_SIZE } from '../../lib/find-queries';
import { RatingDisplay } from '@arteve/shared/reviews';

const DEFAULT_FILTERS: PersonFilters = { location: '', genre: '' };

export default function FindPageWrapper() {
  return (
    <Suspense fallback={(
    <div className="page page-narrow">
      <div className="card card-padded flex items-center gap-3"><span className="inline-block h-4 w-4 rounded-full border-2 border-brand border-r-transparent animate-spin" /><p className="text-sm text-ink-muted">Loading…</p></div>
    </div>
  )}>
      <FindArtistsContent />
    </Suspense>
  );
}

function FindArtistsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<PersonFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* Reset pagination when search or filters change */
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [query, filters.location, filters.genre]);

  /* Fetch musicians */
  useEffect(() => {
    async function run() {
      const trimmed = query.trim();
      const noFilters = !filters.location && !filters.genre;
      // Allow filter-only browsing; only short-circuit when truly empty.
      if (trimmed === '' && noFilters) {
        setResults([]);
        setHasMore(false);
        return;
      }

      setLoading(true);

      try {
        const data = await searchPeople(trimmed, page, filters);
        const newResults = data ?? [];

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
  }, [page, query, filters.location, filters.genre]);

  /* Infinite scroll */
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

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
      {/* Search Input + Filter button */}
      <div className="flex items-center rounded-2xl border border-line bg-surface-sunken px-4 py-3 gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="text-ink-muted hover:text-black transition"
          aria-label="Open filters"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <input
          type="text"
          placeholder="Search musicians by name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            router.push(`/find?q=${e.target.value}`);
          }}
          className="flex-1 bg-transparent outline-none text-ink-strong placeholder:text-ink-subtle"
        />
      </div>

      {/* Active filter chips */}
      {(filters.location || filters.genre) && (
        <div className="flex flex-wrap gap-2">
          {filters.location && (
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink">
              📍 {filters.location}
              <button onClick={() => setFilters((f) => ({ ...f, location: '' }))}>×</button>
            </span>
          )}
          {filters.genre && (
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink">
              🎵 {filters.genre}
              <button onClick={() => setFilters((f) => ({ ...f, genre: '' }))}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Results */}
      <section className="space-y-4">
        {loading && page === 1 && (
          <p className="text-ink-subtle text-sm">Loading…</p>
        )}

        {!loading && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface-sunken px-6 py-10 text-center text-sm text-ink-subtle">
            {query.trim() === '' && !filters.location && !filters.genre
              ? 'Start typing or apply a filter to find musicians.'
              : 'No musicians match your search.'}
          </div>
        )}

        {results.map((m) => (
          <div
            key={m.handle}
            onClick={() => router.push(`/artist/${m.handle}`)}
            className="rounded-2xl border border-line bg-surface shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-sunken transition"
          >
            <img
              src={m.avatar_url ?? '/default-avatar.png'}
              className="w-12 h-12 rounded-xl object-cover border border-line"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{m.display_name}</p>
              <div className="flex flex-wrap gap-2 mt-1 items-center">
                {m.location && (
                  <span className="text-xs text-ink-subtle">{m.location}</span>
                )}
                {m.genres?.slice(0, 3).map((g) => (
                  <span key={g} className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-ink">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            {m.id && <RatingDisplay profileId={m.id} variant="inline" />}
          </div>
        ))}

        {hasMore && (
          <div ref={loadMoreRef} className="py-4 text-center text-ink-subtle text-sm">
            {loading ? "Loading more…" : ""}
          </div>
        )}
      </section>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filter musicians</h2>
              <button onClick={() => setShowFilters(false)} className="text-2xl">×</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Location</label>
              <input
                type="text"
                placeholder="City or area"
                className="w-full border border-line-strong rounded-xl px-3 py-2"
                value={filters.location ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Genre</label>
              <input
                type="text"
                placeholder="Rock, Jazz, Hip-Hop…"
                className="w-full border border-line-strong rounded-xl px-3 py-2"
                value={filters.genre ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, genre: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 border border-line-strong rounded-xl py-2 text-sm"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear
              </button>
              <button
                className="flex-1 bg-black text-white rounded-xl py-2 text-sm"
                onClick={() => setShowFilters(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
