'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';
import { sendNotification } from '@arteve/shared/notifications';
import { toast, usePullToRefresh, PullToRefreshIndicator, Modal, Button } from '@arteve/ui/components';

const PAGE_SIZE = 10;

type Post = {
  id: number;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  kind: 'post' | 'bit' | null;
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

export default function OrganizerHomePage() {
  const router = useRouter();

  // Safety net: Supabase auth emails (signup confirmation / magic link) can
  // land on '/?code=...' when the project's Site URL points at the root.
  // Forward those to the dedicated callback handler so the session actually
  // gets exchanged instead of silently dropping the code.
  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    if (params.get('code') || params.get('token_hash')) {
      router.replace(`/auth/callback${search}`);
    }
  }, [router]);

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
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [viewCommentsPost, setViewCommentsPost] = useState<Post | null>(null);

  // ---------------------------------------------------------
  // Fetch Featured Bits (separate from feed)
  // ---------------------------------------------------------
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
          kind,
          profiles:profiles!profile_id (
            id,
            display_name,
            avatar_url,
            handle
          )
        `
        )
        .eq('kind', 'bit')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      setBits((data ?? []) as unknown as Post[]);
    } catch (err) {
      console.error(err);
      setBits([]);
    }
  }

  // ---------------------------------------------------------
  // Fetch one page of feed posts
  // ---------------------------------------------------------
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
          kind,
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
            profiles:profiles!user_id(
              display_name,
              avatar_url,
              handle
            )
          ),
          post_comments_count:post_comments(count)
        `
        )
        .eq('kind', 'post')
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
        setErrorMsg('Unable to load content right now.');
        setPosts([]);
      }
      setHasMore(false);
      return 0;
    }
  }

  // ---------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // Infinite scroll listener
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // Helper: refresh first page (after like/comment)
  // ---------------------------------------------------------
  async function refreshFeed() {
    setIsInitialLoading(true);
    const count = await loadFeedPage(0, false);
    setPage(count === PAGE_SIZE ? 1 : 0);
    setIsInitialLoading(false);
  }

  // ---------------------------------------------------------
  // Like
  // ---------------------------------------------------------
  async function toggleLike(postId: number) {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;

    const p = posts.find(x => x.id === postId);
    const alreadyLiked = p?.post_likes?.some(l => l.user_id === userId) ?? false;

    // Optimistic flip
    setPosts((prev) =>
      prev.map((post) =>
        post.id !== postId
          ? post
          : {
              ...post,
              post_likes: alreadyLiked
                ? (post.post_likes ?? []).filter((l) => l.user_id !== userId)
                : [...(post.post_likes ?? []), { user_id: userId }],
            }
      )
    );

    const { error } = alreadyLiked
      ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      : await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });

    if (error) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id !== postId
            ? post
            : {
                ...post,
                post_likes: alreadyLiked
                  ? [...(post.post_likes ?? []), { user_id: userId }]
                  : (post.post_likes ?? []).filter((l) => l.user_id !== userId),
              }
        )
      );
      toast.error(alreadyLiked ? "Couldn't unlike" : "Couldn't like");
      return;
    }

    if (!alreadyLiked && p?.profiles?.id && p.profiles.id !== userId) {
      sendNotification({
        userId: p.profiles.id,
        type: 'like',
        body: 'liked your post',
        data: { post_id: postId },
      });
    }
  }

  // ---------------------------------------------------------
  // Add comment
  // ---------------------------------------------------------
  async function addComment() {
    if (!commentModalPost || commentSubmitting) return;

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    const text = newComment.trim();
    if (!text) return;

    setCommentSubmitting(true);
    const author = commentModalPost.profiles?.id;
    const postId = commentModalPost.id;

    const { data: meProf } = await supabase
      .from('profiles').select('display_name, handle, avatar_url').eq('id', userId).maybeSingle();

    const { data: inserted, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, comment: text })
      .select('id, comment, created_at')
      .single();
    setCommentSubmitting(false);

    if (error || !inserted) {
      toast.error("Couldn't post your comment. Try again.");
      return;
    }

    // Patch the affected post in place (preserves scroll position).
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newComment = {
          id: inserted.id as number,
          comment: inserted.comment as string,
          created_at: inserted.created_at as string,
          profiles: {
            display_name: meProf?.display_name ?? null,
            avatar_url: meProf?.avatar_url ?? null,
            handle: meProf?.handle ?? null,
          },
        };
        const existing = p.post_comments ?? [];
        const existingCount = p.post_comments_count?.[0]?.count ?? existing.length;
        return {
          ...p,
          post_comments: [...existing, newComment],
          post_comments_count: [{ count: existingCount + 1 }],
        };
      })
    );

    if (author && author !== userId) {
      sendNotification({
        userId: author,
        type: 'comment',
        body: text.length > 80 ? `commented: ${text.slice(0, 80)}…` : `commented: ${text}`,
        data: { post_id: postId },
      });
    }

    setNewComment('');
    setCommentModalPost(null);
  }

  const pull = usePullToRefresh({ onRefresh: refreshFeed });

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <PullToRefreshIndicator {...pull} />
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Discover Musicians
          </h1>
          <p className="mt-2 text-sm text-ink-subtle md:text-base">
            Scroll recent performances and shortlist artists for your next event.
          </p>
        </div>
      </header>

      {/* Featured Bits */}
      {bits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Featured Bits</h2>
            <Link href="/find?tab=people" className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">
              Discover all artists →
            </Link>
          </div>

          <div className="-mx-4 px-4 md:-mx-6 md:px-6 flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory">
            {bits.slice(0, 10).map(post => (
              <Link
                key={post.id}
                href={post.profiles?.handle ? `/profile/${post.profiles.handle}` : '#'}
                aria-label={post.caption ?? 'Open bit'}
                className="group relative h-56 w-40 shrink-0 overflow-hidden rounded-2xl bg-ink-strong sm:h-64 sm:w-48 snap-start shadow-sm hover:shadow-md transition"
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
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink-strong shadow-lg">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 ml-0.5" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3">
                  {post.profiles?.display_name && (
                    <p className="text-[11px] font-semibold text-white/95 truncate">
                      {post.profiles.display_name}
                    </p>
                  )}
                  {post.caption && (
                    <p className="line-clamp-2 text-xs text-white/85 mt-0.5">
                      {post.caption}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Feed */}
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-ink-strong">
          Recent performances
        </h2>

        {/* Initial skeleton — matches real post card so there's no jump */}
        {isInitialLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <article
                key={i}
                className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                </div>
                <div className="skeleton aspect-square w-full rounded-none" />
                <div className="flex items-center gap-4 p-4">
                  <div className="skeleton h-6 w-6 rounded-full" />
                  <div className="skeleton h-6 w-6 rounded-full" />
                  <div className="skeleton h-6 w-6 rounded-full" />
                </div>
                <div className="space-y-2 px-4 pb-4">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </article>
            ))}
          </div>
        )}

        {errorMsg && !isInitialLoading && (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger">
            {errorMsg}
          </div>
        )}

        {!isInitialLoading &&
          !errorMsg &&
          posts.map(post => {
            const likes = post.post_likes?.length ?? 0;
            const comments = post.post_comments_count?.[0]?.count ?? 0;

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              >
                {/* Card header */}
                <div className="px-6 pt-6 pb-4">
                  <Link
                    href={post.profiles?.handle ? `/profile/${post.profiles.handle}` : '#'}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={post.profiles?.avatar_url ?? '/default-avatar.png'}
                      className="h-10 w-10 rounded-full object-cover"
                      alt="avatar"
                    />

                    <div>
                      <p className="text-sm font-semibold text-ink-strong">
                        {post.profiles?.display_name ?? 'Musician'}
                      </p>
                      <p className="text-xs text-ink-subtle">
                        Tap to view full profile
                      </p>
                    </div>
                  </Link>

                  {post.caption && (
                    <p className="mt-4 text-sm text-ink-strong">
                      {post.caption}
                    </p>
                  )}
                </div>

                {/* Media — IG-style 4:5 cap so tall posts don't push the
                    actions row past the fold. */}
                <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: '4 / 5', maxHeight: '80vh' }}>
                  {post.media_type === 'video' ? (
                    <video
                      src={post.media_url}
                      controls
                      className="absolute inset-0 h-full w-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt={post.caption ?? ''}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-t border-line">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {likes > 0 && <span>{likes}</span>}
                  </button>
                  <button
                    onClick={() => setCommentModalPost(post)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
                    </svg>
                    {comments > 0 && <span>{comments}</span>}
                  </button>

                  <Link
                    href={`/book/${post.profiles?.id ?? ''}`}
                    className="ml-auto btn btn-brand btn-sm"
                  >
                    Book
                  </Link>
                </div>

                {/* Inline comments preview */}
                {post.post_comments && post.post_comments.length > 0 && (
                  <div className="space-y-2 px-6 pb-6">
                    {post.post_comments.slice(0, 2).map(c => (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Link
                          href={c.profiles?.handle ? `/profile/${c.profiles.handle}` : '#'}
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
                            href={c.profiles?.handle ? `/profile/${c.profiles.handle}` : '#'}
                            className="font-medium text-ink-strong"
                          >
                            {c.profiles?.display_name ?? 'User'}
                          </Link>
                          <p className="text-ink">{c.comment}</p>
                        </div>
                      </div>
                    ))}

                    {(post.post_comments_count?.[0]?.count ?? 0) > 2 && (
                      <button
                        className="text-xs font-medium text-brand"
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
            className="flex items-center justify-center py-6 text-xs text-ink-subtle"
          >
            {isFetchingMore ? 'Loading more performances…' : ''}
          </div>
        )}
      </section>

      <Modal
        open={!!viewCommentsPost}
        onClose={() => setViewCommentsPost(null)}
        title={viewCommentsPost ? `Comments on ${viewCommentsPost.profiles?.display_name ?? 'post'}` : ''}
      >
        {viewCommentsPost?.post_comments?.length ? (
          <ul className="space-y-3">
            {viewCommentsPost.post_comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3 text-sm">
                <Link
                  href={c.profiles?.handle ? `/profile/${c.profiles.handle}` : '#'}
                  className="flex-shrink-0"
                >
                  <img
                    src={c.profiles?.avatar_url ?? '/default-avatar.png'}
                    className="h-8 w-8 rounded-full object-cover"
                    alt=""
                  />
                </Link>
                <div className="min-w-0">
                  <Link
                    href={c.profiles?.handle ? `/profile/${c.profiles.handle}` : '#'}
                    className="font-medium text-ink-strong hover:underline"
                  >
                    {c.profiles?.display_name ?? 'User'}
                  </Link>
                  <p className="text-ink mt-0.5 whitespace-pre-wrap break-words">{c.comment}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-subtle">No comments yet.</p>
        )}
      </Modal>

      <Modal
        open={!!commentModalPost}
        onClose={() => { if (!commentSubmitting) setCommentModalPost(null); }}
        title="Add a comment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCommentModalPost(null)} disabled={commentSubmitting}>
              Cancel
            </Button>
            <Button onClick={addComment} loading={commentSubmitting} disabled={!newComment.trim()}>
              Post
            </Button>
          </>
        }
      >
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write your comment…"
          className="h-28 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition"
        />
      </Modal>
    </main>
  );
}
