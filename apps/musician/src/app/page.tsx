'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';

const PAGE_SIZE = 10;

type Post = {
  id: number;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  is_bit: boolean | null;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    handle: string | null;
  } | null;
  post_likes: { user_id: string }[] | null;
  post_comments: {
    id: number;
    comment: string;
    created_at: string;
    profiles: {
      display_name: string | null;
      avatar_url: string | null;
      handle: string | null;
    } | null;
  }[] | null;
  post_comments_count: { count: number | null }[] | null;
};

export default function MusicianHomePage() {
  const [bits, setBits] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [viewCommentsPost, setViewCommentsPost] = useState<Post | null>(null);

  // ----------------------------------------------------
  // Fetch Featured Bits
  // ----------------------------------------------------
  async function fetchBits() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          id,
          media_url,
          media_type,
          caption,
          created_at,
          is_bit,
          profiles:profiles!profile_id (
            id,
            display_name,
            avatar_url,
            handle
          )
        `
        )
        .eq('is_bit', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      setBits((data ?? []) as unknown as Post[]);
    } catch (err) {
      console.error(err);
      setBits([]);
    }
  }

  // ----------------------------------------------------
  // Fetch a page of feed posts
  // ----------------------------------------------------
  async function loadFeedPage(pageToLoad: number, append: boolean) {
    try {
      if (pageToLoad === 0) {
        setErrorMsg(null);
      }

      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          id,
          media_url,
          media_type,
          caption,
          created_at,
          is_bit,
          profiles:profiles!profile_id (
            id,
            display_name,
            avatar_url,
            handle
          ),
          post_likes:post_likes (
            user_id
          ),
          post_comments:post_comments (
            id,
            comment,
            created_at,
            profiles:profiles!user_id (
              display_name,
              avatar_url,
              handle
            )
          ),
          post_comments_count:post_comments(count)
        `
        )
        .eq('is_bit', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const pagePosts = (data ?? []) as unknown as Post[];
      setPosts(prev => (append ? [...prev, ...pagePosts] : pagePosts));
      setHasMore(pagePosts.length === PAGE_SIZE);

      return pagePosts.length;
    } catch (err) {
      console.error(err);
      if (pageToLoad === 0) {
        setErrorMsg('Unable to load posts right now.');
        setPosts([]);
      }
      setHasMore(false);
      return 0;
    }
  }

  // ----------------------------------------------------
  // Initial load
  // ----------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsInitialLoading(true);
      await fetchBits();
      const count = await loadFeedPage(0, false);
      if (!cancelled) {
        setPage(count === PAGE_SIZE ? 1 : 0);
        setIsInitialLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------
  // Infinite scroll
  // ----------------------------------------------------
  useEffect(() => {
    if (isInitialLoading || !hasMore) return;

    const target = loaderRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (!first.isIntersecting) return;
        if (isFetchingMore) return;

        setIsFetchingMore(true);
        loadFeedPage(page, true).then(count => {
          setIsFetchingMore(false);
          if (count === PAGE_SIZE) {
            setPage(prev => prev + 1);
          } else {
            setHasMore(false);
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [page, hasMore, isInitialLoading, isFetchingMore]);

  // ----------------------------------------------------
  // Refresh first page (after like/comment)
  // ----------------------------------------------------
  async function refreshFeed() {
    setIsInitialLoading(true);
    const count = await loadFeedPage(0, false);
    setPage(count === PAGE_SIZE ? 1 : 0);
    setIsInitialLoading(false);
  }

  // ----------------------------------------------------
  // LIKE / UNLIKE
  // ----------------------------------------------------
  async function toggleLike(postId: number) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const post = posts.find(p => p.id === postId);
    const alreadyLiked = post?.post_likes?.some(l => l.user_id === userId);

    if (alreadyLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    } else {
      await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: userId,
      });
    }

    await refreshFeed();
  }

  // ----------------------------------------------------
  // ADD COMMENT
  // ----------------------------------------------------
  async function addComment() {
    if (!commentModalPost) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    if (!newComment.trim()) return;

    await supabase.from('post_comments').insert({
      post_id: commentModalPost.id,
      user_id: userId,
      comment: newComment.trim(),
    });

    setNewComment('');
    setCommentModalPost(null);
    await refreshFeed();
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Home
          </h1>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Discover what other artists are sharing across Arteve.
          </p>
        </div>
      </header>

      {/* Featured Bits */}
      {bits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Featured Bits
            </h2>
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              See all
            </button>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
            {bits.slice(0, 10).map(post => (
              <article
                key={post.id}
                className="relative h-56 w-40 shrink-0 overflow-hidden rounded-3xl bg-slate-900 sm:h-64 sm:w-48"
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

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3">
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
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-slate-900">
          Latest from the community
        </h2>

        {/* Initial skeleton */}
        {isInitialLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 h-4 w-32 rounded-full bg-slate-100" />
                <div className="h-56 w-full rounded-2xl bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {errorMsg && !isInitialLoading && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {!isInitialLoading &&
          !errorMsg &&
          posts.map(post => {
            const likesCount = post.post_likes?.length ?? 0;
            const commentsCount = post.post_comments_count?.[0]?.count ?? 0;

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <Link
                    href={`/profile/${post.profiles?.handle ?? ''}`}
                    className="mb-3 flex items-center gap-3"
                  >
                    <img
                      src={post.profiles?.avatar_url ?? '/default-avatar.png'}
                      className="h-10 w-10 rounded-full object-cover"
                      alt="avatar"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {post.profiles?.display_name || 'Arteve musician'}
                      </p>
                    </div>
                  </Link>

                  {post.caption && (
                    <p className="text-sm text-slate-800">{post.caption}</p>
                  )}
                </div>

                {/* Media */}
                {post.media_type === 'video' ? (
                  <video
                    className="w-full max-h-[650px] bg-black object-contain"
                    src={post.media_url}
                    controls
                  />
                ) : (
                  <div className="flex items-center justify-center bg-black/5">
                    <img
                      className="w-full max-h-[650px] object-contain bg-black"
                      src={post.media_url}
                      alt={post.caption ?? ''}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 px-6 py-4 text-xs text-slate-500">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="font-medium hover:text-slate-900"
                  >
                    👍 {likesCount}
                  </button>

                  <button
                    onClick={() => setCommentModalPost(post)}
                    className="font-medium hover:text-slate-900"
                  >
                    💬 {commentsCount}
                  </button>
                </div>

                {/* Comments preview */}
                {post.post_comments && post.post_comments.length > 0 && (
                  <div className="space-y-2 px-6 pb-6">
                    {post.post_comments.slice(0, 2).map(c => (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Link
                          href={`/profile/${c.profiles?.handle ?? ''}`}
                          className="flex-shrink-0"
                        >
                          <img
                            src={
                              c.profiles?.avatar_url ?? '/default-avatar.png'
                            }
                            className="h-7 w-7 rounded-full object-cover"
                            alt="avatar"
                          />
                        </Link>

                        <div>
                          <Link
                            href={`/profile/${c.profiles?.handle ?? ''}`}
                            className="font-medium text-slate-900"
                          >
                            {c.profiles?.display_name ?? 'User'}
                          </Link>
                          <p className="text-slate-700">{c.comment}</p>
                        </div>
                      </div>
                    ))}

                    {(post.post_comments_count?.[0]?.count ?? 0) > 2 && (
                      <button
                        className="text-xs font-medium text-blue-600"
                        onClick={() => setViewCommentsPost(post)}
                      >
                        View all {post.post_comments_count?.[0]?.count} comments
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}

        {/* Infinite scroll sentinel */}
        {!isInitialLoading && hasMore && (
          <div
            ref={loaderRef}
            className="flex items-center justify-center py-6 text-xs text-slate-400"
          >
            {isFetchingMore ? 'Loading more posts…' : ''}
          </div>
        )}
      </section>

      {/* VIEW ALL COMMENTS MODAL */}
      {viewCommentsPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[80vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              All comments on {viewCommentsPost.profiles?.display_name}
            </h2>

            {viewCommentsPost.post_comments?.map(c => (
              <div
                key={c.id}
                className="flex items-start gap-3 text-sm"
              >
                <Link
                  href={`/profile/${c.profiles?.handle ?? ''}`}
                  className="flex-shrink-0"
                >
                  <img
                    src={c.profiles?.avatar_url ?? '/default-avatar.png'}
                    className="h-8 w-8 rounded-full object-cover"
                    alt="avatar"
                  />
                </Link>

                <div>
                  <Link
                    href={`/profile/${c.profiles?.handle ?? ''}`}
                    className="font-medium text-slate-900"
                  >
                    {c.profiles?.display_name ?? 'User'}
                  </Link>
                  <p className="text-slate-700">{c.comment}</p>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <button
                onClick={() => setViewCommentsPost(null)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENT MODAL */}
      {commentModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              Comment on {commentModalPost.profiles?.display_name}
            </h2>

            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              className="h-28 w-full rounded-lg border border-slate-200 p-3 text-sm"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCommentModalPost(null)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={addComment}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
