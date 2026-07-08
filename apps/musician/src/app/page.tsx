'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';
import { AudioPlayer } from '@arteve/shared/media/AudioPlayer';
import { timeAgo } from '@arteve/shared/utils/date';
import { sendNotification } from '@arteve/shared/notifications';
import { toast, usePullToRefresh, PullToRefreshIndicator, Modal, Button, SafeImage } from '@arteve/ui/components';

const PAGE_SIZE = 10;

type Post = {
  id: number;
  media_url: string;
  media_type: 'image' | 'video' | 'audio';
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

type FeedTab = 'for-you' | 'following';

export default function MusicianHomePage() {
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
  const [feedTab, setFeedTab] = useState<FeedTab>('for-you');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

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

      let query = supabase
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
            profiles:profiles!user_id (
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

      // If "Following" tab, restrict to posts authored by accounts the user follows.
      if (feedTab === 'following') {
        if (followingIds.length === 0) {
          // Not following anyone yet → empty feed (let UI render the empty state).
          setPosts(append ? posts : []);
          setHasMore(false);
          return 0;
        }
        query = query.in('profile_id', followingIds);
      }

      const { data, error } = await query;

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
  // Load my own id + who I follow, once.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setMyUserId(uid);
      if (uid) {
        const { data: follows } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', uid);
        setFollowingIds((follows ?? []).map((r) => r.following_id as string));
      }
    })();
  }, []);

  // Reload feed whenever the tab or follow-list changes.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTab, followingIds.length]);

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
    const alreadyLiked = post?.post_likes?.some(l => l.user_id === userId) ?? false;

    // Optimistic flip — patch the like array in place so the heart + count update instantly
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              post_likes: alreadyLiked
                ? (p.post_likes ?? []).filter((l) => l.user_id !== userId)
                : [...(p.post_likes ?? []), { user_id: userId }],
            }
      )
    );

    const { error } = alreadyLiked
      ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      : await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });

    if (error) {
      // Roll back
      setPosts((prev) =>
        prev.map((p) =>
          p.id !== postId
            ? p
            : {
                ...p,
                post_likes: alreadyLiked
                  ? [...(p.post_likes ?? []), { user_id: userId }]
                  : (p.post_likes ?? []).filter((l) => l.user_id !== userId),
              }
        )
      );
      toast.error(alreadyLiked ? "Couldn't unlike" : "Couldn't like");
      return;
    }

    // Notify the post author on a new like (not on unlike, not on self-like).
    if (!alreadyLiked && post?.profiles?.id && post.profiles.id !== userId) {
      sendNotification({
        userId: post.profiles.id,
        type: 'like',
        body: 'liked your post',
        data: { post_id: postId },
      });
    }
  }

  // ----------------------------------------------------
  // ADD COMMENT
  // ----------------------------------------------------
  async function addComment() {
    // Works from both the standalone composer modal and the inline composer
    // inside the "all comments" modal.
    const targetPost = commentModalPost ?? viewCommentsPost;
    if (!targetPost || commentSubmitting) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    const text = newComment.trim();
    if (!text) return;

    setCommentSubmitting(true);
    const author = targetPost.profiles?.id;
    const postId = targetPost.id;

    // Get the commenter's own profile so the optimistic comment renders correctly
    // (avatar / name / handle for the deep link).
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

    // Patch the affected post in place instead of refetching the whole feed
    // (which used to reset scroll back to the top).
    const commentObj = {
      id: inserted.id as number,
      comment: inserted.comment as string,
      created_at: inserted.created_at as string,
      profiles: {
        display_name: meProf?.display_name ?? null,
        avatar_url: meProf?.avatar_url ?? null,
        handle: meProf?.handle ?? null,
      },
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const existing = p.post_comments ?? [];
        const existingCount = p.post_comments_count?.[0]?.count ?? existing.length;
        return {
          ...p,
          post_comments: [...existing, commentObj],
          post_comments_count: [{ count: existingCount + 1 }],
        };
      })
    );

    // Keep the open "all comments" modal in sync so the new comment shows up.
    setViewCommentsPost((prev) =>
      prev && prev.id === postId
        ? { ...prev, post_comments: [...(prev.post_comments ?? []), commentObj] }
        : prev,
    );

    // Notify the post author (skip self-comments).
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
            Home
          </h1>
          <p className="mt-2 text-sm text-ink-subtle md:text-base">
            Discover what other artists are sharing across Arteve.
          </p>
        </div>
      </header>

      {/* Feed tabs */}
      <div className="flex gap-2 border-b border-line">
        {(['for-you', 'following'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFeedTab(t)}
            className={`relative px-3 pb-3 text-sm font-medium transition ${
              feedTab === t
                ? 'text-ink-strong'
                : 'text-ink-subtle hover:text-ink'
            }`}
          >
            {t === 'for-you' ? 'For You' : 'Following'}
            {feedTab === t && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-ink-strong" />
            )}
          </button>
        ))}
      </div>

      {/* Featured Bits */}
      {bits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Featured Bits</h2>
            <Link href="/bits" className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">
              Watch all →
            </Link>
          </div>

          <div className="-mx-4 px-4 md:-mx-6 md:px-6 flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory">
            {bits.slice(0, 10).map(post => (
              <Link
                key={post.id}
                href={`/bits?bit=${post.id}`}
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
                  <SafeImage
                    src={post.media_url}
                    alt={post.caption ?? ''}
                    fill
                    sizes="(max-width: 640px) 160px, 192px"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                )}

                {/* Play overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink-strong shadow-lg">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 ml-0.5" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>

                {/* Footer */}
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
          Latest from the community
        </h2>

        {/* Initial skeleton — matches real post card so there's no jump */}
        {isInitialLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <article
                key={i}
                className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
              >
                {/* Header: avatar + name/handle */}
                <div className="flex items-center gap-3 p-4">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                </div>
                {/* Media */}
                <div className="skeleton aspect-square w-full rounded-none" />
                {/* Action row: like / comment / share */}
                <div className="flex items-center gap-4 p-4">
                  <div className="skeleton h-6 w-6 rounded-full" />
                  <div className="skeleton h-6 w-6 rounded-full" />
                  <div className="skeleton h-6 w-6 rounded-full" />
                </div>
                {/* Caption */}
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

        {!isInitialLoading && !errorMsg && posts.length === 0 && feedTab === 'following' && (
          <div className="empty-state">
            <p className="empty-title">Your following feed is empty.</p>
            <p className="empty-body">Follow other artists and venues to see their posts here.</p>
            <Link href="/find" className="btn btn-primary mt-5 inline-flex">
              Find people to follow
            </Link>
          </div>
        )}

        {!isInitialLoading && !errorMsg && posts.length === 0 && feedTab === 'for-you' && (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface-sunken px-6 py-10 text-center text-sm text-ink-subtle">
            Nothing posted yet — be the first.
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
                className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <Link
                    href={post.profiles?.handle ? `/profile/${post.profiles.handle}` : '#'}
                    className="mb-3 flex items-center gap-3"
                  >
                    <img
                      src={post.profiles?.avatar_url ?? '/default-avatar.png'}
                      className="h-10 w-10 rounded-full object-cover"
                      alt="avatar"
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink-strong">
                        {post.profiles?.display_name || 'Arteve musician'}
                      </p>
                      <p className="text-xs text-ink-subtle">{timeAgo(post.created_at)}</p>
                    </div>
                  </Link>

                  {post.caption && (
                    <p className="text-sm text-ink-strong">{post.caption}</p>
                  )}
                </div>

                {/* Media */}
                {post.media_type === 'video' && (
                  <video
                    className="w-full max-h-[650px] bg-black object-contain"
                    src={post.media_url}
                    controls
                  />
                )}
                {post.media_type === 'image' && (
                  // Instagram-style cap: never taller than 4:5, never taller
                  // than the viewport. Tall images get center-cropped so the
                  // action row stays within the fold instead of scrolling.
                  <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: '4 / 5', maxHeight: '80vh' }}>
                    <SafeImage
                      src={post.media_url}
                      alt={post.caption ?? ''}
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="object-cover"
                    />
                  </div>
                )}
                {post.media_type === 'audio' && (
                  <div className="px-6 pb-2">
                    <AudioPlayer src={post.media_url} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-t border-line">
                  {(() => {
                    const liked = post.post_likes?.some((l) => l.user_id === myUserId) ?? false;
                    return (
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          liked ? 'bg-danger/10 text-danger' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                        }`}
                        aria-pressed={liked}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {likesCount > 0 && <span>{likesCount}</span>}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => setCommentModalPost(post)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
                    </svg>
                    {commentsCount > 0 && <span>{commentsCount}</span>}
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
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
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
            {isFetchingMore ? 'Loading more posts…' : ''}
          </div>
        )}
      </section>

      {/* VIEW ALL COMMENTS MODAL */}
      {/* All comments dialog — portaled via the shared Modal so it always
          centers in the viewport, not mid-document. */}
      <Modal
        open={!!viewCommentsPost}
        onClose={() => { if (!commentSubmitting) { setViewCommentsPost(null); setNewComment(''); } }}
        title="Comments"
        footer={
          <form
            className="flex w-full items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); addComment(); }}
          >
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition"
            />
            <Button type="submit" loading={commentSubmitting} disabled={!newComment.trim()}>
              Post
            </Button>
          </form>
        }
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

      {/* Comment composer */}
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
