'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

type Post = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
};

export default function MusicianHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, media_url, media_type, caption, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setPosts((data as Post[]) || []);
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to load posts right now.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="space-y-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discover what other artists are sharing across Arteve.
          </p>
        </div>
      </header>

      {/* Featured Bits row */}
      {posts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
              Featured Bits
            </h2>
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
              // you can wire this to /bits later
              onClick={() => {}}
            >
              See all
            </button>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
            {posts.slice(0, 8).map((post) => (
              <article
                key={post.id}
                className="relative h-52 w-40 shrink-0 overflow-hidden rounded-2xl bg-slate-900"
              >
                {post.media_type === 'video' ? (
                  <video
                    src={post.media_url}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt={post.caption ?? ''}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3">
                  {post.caption && (
                    <p className="line-clamp-2 text-xs font-medium text-white">
                      {post.caption}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Latest from the community
          </h2>
        </div>

        {loading && (
          <div className="space-y-4">
            {/* simple skeletons */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-3 h-4 w-32 rounded-full bg-slate-100" />
                <div className="h-48 w-full rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {errorMsg && !loading && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && posts.length === 0 && (
          <p className="text-sm text-slate-500">
            No posts yet. Be the first to share something from the{' '}
            <span className="font-medium">Post</span> tab.
          </p>
        )}

        {!loading &&
          !errorMsg &&
          posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="p-4">
                {/* You can replace this with real avatar + name when available */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Arteve musician
                    </p>
                    <p className="text-xs text-slate-500">
                      Sharing a new bit from their show
                    </p>
                  </div>
                </div>

                {post.caption && (
                  <p className="mb-3 text-sm text-slate-800">{post.caption}</p>
                )}
              </div>

              {post.media_type === 'video' ? (
                <video
                  className="w-full max-h-[480px] bg-black object-cover"
                  src={post.media_url}
                  controls
                />
              ) : (
                <img
                  className="w-full max-h-[480px] object-cover"
                  src={post.media_url}
                  alt={post.caption ?? ''}
                />
              )}

              <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <button className="font-medium text-slate-700 hover:text-slate-900">
                    Like
                  </button>
                  <button className="font-medium text-slate-700 hover:text-slate-900">
                    Comment
                  </button>
                </div>
                <span>Discover more on their profile</span>
              </div>
            </article>
          ))}
      </section>
    </main>
  );
}
