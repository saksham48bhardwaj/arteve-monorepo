'use client';

import { Suspense } from 'react';
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { searchPeople, PersonResult, PAGE_SIZE } from '../../lib/find-queries';

export default function FindPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
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

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* Reset pagination anytime query changes */
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [query]);

  /* Fetch musicians */
  useEffect(() => {
    async function run() {
      if (query.trim() === "") {
        setResults([]);
        setHasMore(false);
        return;
      }

      setLoading(true);

      try {
        const data = await searchPeople(query.trim(), page);
        const newResults = data ?? [];

        setResults(prev =>
          page === 1 ? newResults : [...prev, ...newResults]
        );

        setHasMore(newResults.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }

    run();
  }, [page, query]);

  /* Infinite scroll */
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* Search Input */}
      <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 gap-3 shadow-sm">
        <input
          type="text"
          placeholder="Search musicians…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            router.push(`/find?q=${e.target.value}`);
          }}
          className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-500"
        />
      </div>

      {/* Results */}
      <section className="space-y-4">
        {loading && page === 1 && (
          <p className="text-gray-500 text-sm">Loading…</p>
        )}

        {!loading && results.length === 0 && (
          <p className="text-center text-sm text-gray-500 pt-6">
            No musicians found.
          </p>
        )}

        {results.map((m) => (
          <div
            key={m.handle}
            onClick={() => router.push(`/profile/${m.handle}`)}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
          >
            <img
              src={m.avatar_url ?? '/default-avatar.png'}
              className="w-12 h-12 rounded-xl object-cover border"
              alt=""
            />
            <div>
              <p className="font-medium">{m.display_name}</p>
              {m.location && (
                <p className="text-sm text-gray-500">{m.location}</p>
              )}
            </div>
          </div>
        ))}

        {/* Infinite Scroll Trigger */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="py-4 text-center text-gray-400 text-sm"
          >
            {loading ? "Loading more…" : ""}
          </div>
        )}
      </section>
    </main>
  );
}
