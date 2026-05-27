'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Avatar, Spinner, toast } from '@arteve/ui/components';

type ProfileInfo = {
  display_name: string | null;
  avatar_url: string | null;
  handle: string | null;
};

type Bit = {
  id: number;
  media_url: string;
  media_type: 'image' | 'video' | 'audio';
  caption: string | null;
  created_at: string;
  profile_id: string;
  profiles: ProfileInfo | null;
  likes: number;
  has_liked: boolean;
};

type RawProfile = ProfileInfo | ProfileInfo[] | null;

type RawComment = {
  id: number;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: RawProfile;
};

type Comment = {
  id: number;
  user_id: string;
  comment: string;
  created_at: string;
  profile: ProfileInfo;
};

export default function BitsPageWrapper() {
  return (
    <Suspense
      fallback={
        <main className="h-screen w-full bg-black flex items-center justify-center">
          <Spinner size={20} className="text-white" />
        </main>
      }
    >
      <BitsReelsPage />
    </Suspense>
  );
}

function BitsReelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startBitParam = searchParams.get('bit');

  const [rows, setRows] = useState<Bit[]>([]);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentOpenFor, setCommentOpenFor] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');

  // Tap-to-pause: remember which bit the user manually paused so IO doesn't auto-resume it.
  const [pausedBitId, setPausedBitId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load all bits + like state once
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;

      const { data: bits } = await supabase
        .from('posts')
        .select(
          `id, media_url, media_type, caption, created_at, profile_id,
           profiles ( display_name, avatar_url, handle )`,
        )
        .eq('kind', 'bit')
        .order('created_at', { ascending: false });

      if (!bits) {
        setLoading(false);
        return;
      }

      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id, user_id');

      const enriched: Bit[] = bits.map((row) => {
        const profileRaw = row.profiles as RawProfile;
        const profile = Array.isArray(profileRaw) ? profileRaw[0] ?? null : profileRaw;
        const bitLikes = (likes ?? []).filter((l) => l.post_id === row.id);
        return {
          id: row.id as number,
          media_url: row.media_url as string,
          media_type: (row.media_type as Bit['media_type']) ?? 'image',
          caption: (row.caption as string | null) ?? null,
          created_at: row.created_at as string,
          profile_id: row.profile_id as string,
          profiles: profile,
          likes: bitLikes.length,
          has_liked: !!uid && bitLikes.some((l) => l.user_id === uid),
        };
      });

      setRows(enriched);
      setLoading(false);

      // Deep-link: scroll to ?bit=ID if present
      if (startBitParam) {
        requestAnimationFrame(() => {
          const target = document.querySelector(`[data-bit-id="${startBitParam}"]`);
          if (target && target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
          }
        });
      }
    })();
  }, [startBitParam]);

  // Auto-play videos as they scroll into view (only video bits)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const videos = Array.from(container.querySelectorAll('video'));
    if (videos.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target as HTMLVideoElement;
          const bitId = Number(vid.dataset.bitId);
          if (entry.isIntersecting) {
            // Don't auto-resume a video the user explicitly paused
            if (pausedBitId !== bitId) vid.play().catch(() => {});
          } else {
            vid.pause();
            // Scrolling away clears any manual-pause state for that bit
            if (pausedBitId === bitId) setPausedBitId(null);
          }
        });
      },
      { threshold: 0.7 },
    );
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [rows, pausedBitId]);

  function toggleVideoPause(bit: Bit, e: React.MouseEvent<HTMLVideoElement>) {
    const vid = e.currentTarget;
    if (vid.paused) {
      vid.play().catch(() => {});
      setPausedBitId(null);
    } else {
      vid.pause();
      setPausedBitId(bit.id);
    }
  }

  async function toggleLike(bit: Bit) {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    if (bit.has_liked) {
      await supabase.from('post_likes').delete().eq('post_id', bit.id).eq('user_id', uid);
      setRows((prev) => prev.map((b) => (b.id === bit.id ? { ...b, has_liked: false, likes: b.likes - 1 } : b)));
    } else {
      await supabase.from('post_likes').insert({ post_id: bit.id, user_id: uid });
      setRows((prev) => prev.map((b) => (b.id === bit.id ? { ...b, has_liked: true, likes: b.likes + 1 } : b)));
    }
  }

  async function openComments(bitId: number) {
    setCommentOpenFor(bitId);
    const { data } = await supabase
      .from('post_comments')
      .select(
        `id, user_id, comment, created_at,
         profiles!post_comments_user_id_fkey ( display_name, avatar_url, handle )`,
      )
      .eq('post_id', bitId)
      .order('created_at', { ascending: true });

    const mapped: Comment[] = (data ?? []).map((row) => {
      const r = row as unknown as RawComment;
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id,
        user_id: r.user_id,
        comment: r.comment,
        created_at: r.created_at,
        profile: profile ?? { display_name: null, avatar_url: null, handle: null },
      };
    });
    setComments(mapped);
  }

  async function sendComment() {
    if (!newComment.trim() || !commentOpenFor) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    await supabase.from('post_comments').insert({
      post_id: commentOpenFor,
      user_id: uid,
      comment: newComment.trim(),
    });
    setNewComment('');
    openComments(commentOpenFor);
  }

  async function shareBit(bit: Bit) {
    const url = `${location.origin}/bits?bit=${bit.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Arteve · Bit', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch { /* user cancelled */ }
  }

  if (loading) {
    // Show the chrome the user expects (close button + action rail) so the
    // page doesn't feel like a void while videos load.
    return (
      <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Spinner size={20} className="text-white" />
        </span>
        <p className="mt-3 text-xs uppercase tracking-widest text-white/60">Loading bits</p>
      </main>
    );
  }

  if (rows.length === 0) {
    return (
      <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-center px-6">
        <p className="text-white/95 text-base font-semibold">No bits yet</p>
        <p className="text-white/70 text-sm mt-1">When artists post short clips, they show up here.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 inline-flex items-center rounded-full bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition"
        >
          ← Back
        </button>
      </main>
    );
  }

  return (
    <>
      {/* Close button (always visible) */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Close"
        className="fixed top-4 left-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 hover:bg-black/60 text-white transition"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black"
        style={{ scrollbarWidth: 'none' as const }}
      >
        {rows.map((b) => {
          const liked = b.has_liked;
          return (
            <section
              key={b.id}
              data-bit-id={b.id}
              className="relative h-screen w-full snap-start flex items-center justify-center"
            >
              {/* Media */}
              {b.media_type === 'video' ? (
                <>
                  <video
                    src={b.media_url}
                    data-bit-id={b.id}
                    muted
                    loop
                    playsInline
                    onClick={(e) => toggleVideoPause(b, e)}
                    className="h-full w-full object-contain bg-black cursor-pointer"
                  />
                  {pausedBitId === b.id && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
                        <svg viewBox="0 0 24 24" className="h-9 w-9 ml-1" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </div>
                  )}
                </>
              ) : b.media_type === 'audio' ? (
                <div className="h-full w-full flex flex-col items-center justify-center bg-[linear-gradient(135deg,var(--brand-700),var(--brand-500),var(--accent-500))] text-white px-6">
                  <svg viewBox="0 0 24 24" className="h-16 w-16 opacity-90" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  <audio src={b.media_url} controls className="mt-6 w-full max-w-sm" />
                </div>
              ) : (
                <img
                  src={b.media_url}
                  alt={b.caption ?? ''}
                  className="h-full w-full object-contain bg-black"
                />
              )}

              {/* Subtle dark gradient at the bottom so overlay copy stays legible */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Artist + caption (bottom-left) */}
              <div className="absolute left-4 right-20 bottom-24 text-white space-y-2 drop-shadow">
                <Link
                  href={b.profiles?.handle ? `/profile/${b.profiles.handle}` : '#'}
                  className="inline-flex items-center gap-2"
                >
                  <Avatar src={b.profiles?.avatar_url} alt={b.profiles?.display_name ?? ''} size="sm" className="ring-1 ring-white/60" />
                  <span className="text-sm font-semibold">
                    {b.profiles?.display_name ?? 'Artist'}
                  </span>
                </Link>
                {b.caption && (
                  <p className="text-sm leading-snug line-clamp-3 max-w-md">{b.caption}</p>
                )}
              </div>

              {/* Action rail (bottom-right) */}
              <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-white">
                <button
                  type="button"
                  onClick={() => toggleLike(b)}
                  aria-pressed={liked}
                  className="flex flex-col items-center group"
                >
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition ${liked ? 'text-danger' : 'text-white'}`}>
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </span>
                  <span className="text-[11px] mt-0.5 font-semibold tabular">{b.likes}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openComments(b.id)}
                  className="flex flex-col items-center group"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
                    </svg>
                  </span>
                  <span className="text-[11px] mt-0.5 font-semibold">Comments</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareBit(b)}
                  className="flex flex-col items-center group"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </span>
                  <span className="text-[11px] mt-0.5 font-semibold">Share</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {/* COMMENT SHEET */}
      {commentOpenFor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setCommentOpenFor(null)}
        >
          <div
            className="w-full max-w-md bg-surface rounded-t-3xl shadow-xl max-h-[75vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-3 pb-2 flex flex-col items-center">
              <span className="block h-1 w-10 rounded-full bg-line-strong mb-2" />
              <h2 className="text-base font-bold text-ink-strong">Comments</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-ink-subtle text-center py-8">No comments yet — be the first.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar src={c.profile.avatar_url} alt={c.profile.display_name ?? ''} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-ink-strong">{c.profile.display_name ?? 'User'}</span>
                        <span className="text-ink ml-2">{c.comment}</span>
                      </p>
                      <p className="text-[11px] text-ink-subtle mt-0.5">
                        {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); sendComment(); }}
              className="border-t border-line p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex items-center gap-2"
            >
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-full bg-surface-sunken px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:bg-surface transition"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="btn btn-primary btn-sm"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
