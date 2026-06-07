'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@arteve/supabase/client';
import { sendNotification } from '@arteve/shared/notifications';
import { AudioPlayer } from '@arteve/shared/media/AudioPlayer';
import { cn } from '../components/cn';
import { toast } from '../components/Toast';

export type PostViewerItem = {
  id: string | number;
  media_url: string;
  media_type: string; // 'image' | 'video' | 'audio' | legacy/unknown
  caption?: string | null;
  created_at?: string | null;
};

export type PostViewerAuthor = {
  id?: string | null;
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
};

type CommentRow = {
  id: number;
  comment: string;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null; handle: string | null } | null;
};

export interface PostViewerModalProps {
  items: PostViewerItem[];
  /** Index of the open item, or null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  author?: PostViewerAuthor | null;
  /** Logged-in user id — required for likes/comments. */
  viewerId?: string | null;
  /** Enable likes / comments / share. Defaults to true. Pass false for plain galleries. */
  social?: boolean;
  /** Show a Delete action (e.g. on the owner's own profile). */
  canDelete?: boolean;
  onDelete?: (item: PostViewerItem) => void | Promise<void>;
}

/** Plain <img> with a graceful "media unavailable" fallback — a deleted or
 *  missing storage file should not render as a broken-image icon. */
function ViewerImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => { setErrored(false); }, [src]);

  if (errored) {
    return (
      <div role="img" aria-label="Media unavailable"
        className="flex h-64 w-full max-w-md flex-col items-center justify-center gap-2 text-white/60">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
        </svg>
        <p className="text-sm font-medium">This media is no longer available</p>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setErrored(true)} />;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.round(d / 7)}w`;
}

export function PostViewerModal({
  items,
  index,
  onIndexChange,
  onClose,
  author,
  viewerId,
  social = true,
  canDelete = false,
  onDelete,
}: PostViewerModalProps) {
  const current =
    index !== null && index >= 0 && index < items.length ? items[index] : null;
  const open = current !== null;
  const multiple = items.length > 1;

  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const next = useCallback(() => {
    if (!multiple || index === null) return;
    onIndexChange((index + 1) % items.length);
  }, [multiple, index, items.length, onIndexChange]);

  const prev = useCallback(() => {
    if (!multiple || index === null) return;
    onIndexChange((index - 1 + items.length) % items.length);
  }, [multiple, index, items.length, onIndexChange]);

  // Keyboard: Esc to close, arrows to navigate.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, next, prev]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  // Load likes + comments for the active post.
  useEffect(() => {
    if (!open || !social || !current) return;
    const postId = current.id;
    let cancelled = false;

    setDraft('');
    setComments([]);
    setLiked(false);
    setLikeCount(0);
    setCommentsLoading(true);

    (async () => {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from('post_likes').select('user_id').eq('post_id', postId),
        supabase
          .from('post_comments')
          .select('id, comment, created_at, profiles:profiles!user_id ( display_name, avatar_url, handle )')
          .eq('post_id', postId)
          .order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;
      const likes = (likeRows ?? []) as { user_id: string }[];
      setLikeCount(likes.length);
      setLiked(!!viewerId && likes.some((l) => l.user_id === viewerId));
      setComments((commentRows ?? []) as unknown as CommentRow[]);
      setCommentsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [open, social, current?.id, viewerId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleLike() {
    if (!current) return;
    if (!viewerId) { toast.error('Log in to like posts.'); return; }
    const postId = current.id;
    const wasLiked = liked;

    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    const { error } = wasLiked
      ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', viewerId)
      : await supabase.from('post_likes').insert({ post_id: postId, user_id: viewerId });

    if (error) {
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      toast.error(wasLiked ? "Couldn't unlike" : "Couldn't like");
      return;
    }
    if (!wasLiked && author?.id && author.id !== viewerId) {
      void sendNotification({ userId: author.id, type: 'like', body: 'liked your post', data: { post_id: postId } });
    }
  }

  function focusComposer() {
    inputRef.current?.focus();
  }

  async function submitComment() {
    if (!current || submitting) return;
    if (!viewerId) { toast.error('Log in to comment.'); return; }
    const text = draft.trim();
    if (!text) return;
    const postId = current.id;

    setSubmitting(true);
    const { data: me } = await supabase
      .from('profiles').select('display_name, avatar_url, handle').eq('id', viewerId).maybeSingle();
    const { data: inserted, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: viewerId, comment: text })
      .select('id, comment, created_at')
      .single();
    setSubmitting(false);

    if (error || !inserted) { toast.error("Couldn't post your comment. Try again."); return; }

    setComments((prevList) => [
      ...prevList,
      {
        id: inserted.id as number,
        comment: inserted.comment as string,
        created_at: inserted.created_at as string,
        profiles: {
          display_name: (me?.display_name as string) ?? null,
          avatar_url: (me?.avatar_url as string) ?? null,
          handle: (me?.handle as string) ?? null,
        },
      },
    ]);
    setDraft('');
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });

    if (author?.id && author.id !== viewerId) {
      void sendNotification({
        userId: author.id,
        type: 'comment',
        body: text.length > 80 ? `commented: ${text.slice(0, 80)}…` : `commented: ${text}`,
        data: { post_id: postId },
      });
    }
  }

  async function share() {
    if (!current) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = author?.handle ? `${origin}/profile/${author.handle}` : (typeof window !== 'undefined' ? window.location.href : '');
    const text = current.caption ?? `Check out ${author?.display_name ?? 'this artist'} on Arteve`;
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try { await nav.share({ title: 'Arteve', text, url }); } catch { /* user dismissed */ }
      return;
    }
    try {
      await nav?.clipboard?.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  async function handleDelete() {
    if (!current || !onDelete || deleting) return;
    setDeleting(true);
    try { await onDelete(current); } finally { setDeleting(false); }
  }

  if (!open || !current || !mounted || typeof document === 'undefined') return null;
  const item = current;
  const isAudio = item.media_type === 'audio';
  const authorHref = author?.handle ? `/profile/${author.handle}` : undefined;

  const closeBtn = (cls: string) => (
    <button type="button" onClick={onClose} aria-label="Close"
      className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full transition', cls)}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );

  const mediaInner = isAudio ? (
    <div className="w-full max-w-md px-6 py-10">
      <AudioPlayer src={item.media_url} title={item.caption ?? 'Audio'} />
    </div>
  ) : item.media_type === 'video' ? (
    <video src={item.media_url} controls className="max-h-[55vh] max-w-full object-contain md:max-h-full" />
  ) : (
    <ViewerImage src={item.media_url} alt={item.caption ?? `Post by ${author?.display_name ?? 'artist'}`}
      className="max-h-[55vh] w-auto max-w-full object-contain md:max-h-full" />
  );

  const navButtons = multiple && (
    <>
      <button type="button" onClick={prev} aria-label="Previous"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65 transition">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button type="button" onClick={next} aria-label="Next"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65 transition">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </>
  );

  // ---------- GALLERY MODE (venue photos: same card shell, photo-focused, no comments) ----------
  if (!social) {
    const galleryMedia = isAudio ? (
      <div className="w-full max-w-md px-6"><AudioPlayer src={item.media_url} title={item.caption ?? 'Audio'} /></div>
    ) : item.media_type === 'video' ? (
      <video src={item.media_url} controls className="max-h-full max-w-full object-contain" />
    ) : (
      <ViewerImage src={item.media_url} alt={item.caption ?? `Photo by ${author?.display_name ?? 'venue'}`} className="max-h-full max-w-full object-contain" />
    );

    const galleryNode = (
      <div role="dialog" aria-modal="true" aria-label="Photo"
        className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-surface md:h-[88vh] md:max-h-[860px] md:w-auto md:max-w-[92vw] md:rounded-2xl md:shadow-2xl">
          {/* Top bar — back to posts + venue identity + desktop close */}
          <div className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-2">
            <button type="button" onClick={onClose} aria-label="Back to posts"
              className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-sm font-semibold text-ink-strong transition hover:bg-surface-sunken md:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Posts
            </button>
            <a href={authorHref} className={cn('flex min-w-0 items-center gap-2', !authorHref && 'pointer-events-none')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={author?.avatar_url || '/default-avatar.png'} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              <span className="truncate text-sm font-semibold text-ink-strong">{author?.display_name ?? 'Photos'}</span>
            </a>
            <button type="button" onClick={onClose} aria-label="Close"
              className="ml-auto hidden h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-sunken hover:text-ink md:inline-flex">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* Media */}
          <div className="relative flex flex-1 items-center justify-center bg-black md:min-h-0">
            {galleryMedia}
            {navButtons}
          </div>

          {/* Caption */}
          {item.caption && (
            <div className="shrink-0 border-t border-line px-4 py-3">
              <p className="text-sm text-ink whitespace-pre-line">{item.caption}</p>
            </div>
          )}
        </div>
      </div>
    );
    return createPortal(galleryNode, document.body);
  }

  // ---------- POST MODE (social, Instagram-style) ----------
  const node = (
    <div role="dialog" aria-modal="true" aria-label="Post"
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-surface md:h-[88vh] md:max-h-[860px] md:w-auto md:max-w-[1080px] md:flex-row md:rounded-2xl md:shadow-2xl">
        {/* Mobile top bar — back to the posts grid (Instagram-style; hidden on desktop) */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-2 md:hidden">
          <button type="button" onClick={onClose} aria-label="Back to posts"
            className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-sm font-semibold text-ink-strong transition hover:bg-surface-sunken">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Posts
          </button>
        </div>

        {/* Media pane */}
        <div className={cn('relative flex shrink-0 items-center justify-center md:h-full md:min-w-0 md:flex-1', isAudio ? 'bg-surface-sunken' : 'bg-black')}>
          {mediaInner}
          {navButtons}
        </div>

        {/* Detail pane */}
        <aside className="flex min-h-0 flex-1 flex-col bg-surface md:h-full md:w-[400px] md:flex-none md:border-l md:border-line">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
            <a href={authorHref} className={cn('flex min-w-0 items-center gap-3', !authorHref && 'pointer-events-none')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={author?.avatar_url || '/default-avatar.png'} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-ink-strong">{author?.display_name ?? 'Artist'}</p>
                <p className="truncate text-xs text-ink-subtle">
                  {author?.handle ? `@${author.handle}` : ''}{author?.handle && item.created_at ? ' · ' : ''}{timeAgo(item.created_at)}
                </p>
              </div>
            </a>
            <div className="ml-auto flex items-center gap-1">
              {canDelete && onDelete && (
                <button type="button" onClick={handleDelete} disabled={deleting} aria-label="Delete post"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              )}
              {closeBtn('hidden text-ink-muted hover:bg-surface-sunken hover:text-ink md:inline-flex')}
            </div>
          </div>

          {/* Caption + comments (scrolls) */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {item.caption && (
              <div className="flex items-start gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={author?.avatar_url || '/default-avatar.png'} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold text-ink-strong">{author?.display_name ?? 'Artist'}</span>{' '}
                  <span className="text-ink whitespace-pre-line">{item.caption}</span>
                </p>
              </div>
            )}

            {commentsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="skeleton h-7 w-7 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-2.5 w-24 rounded" />
                      <div className="skeleton h-2.5 w-3/4 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-disabled" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-ink">No comments yet</p>
                <p className="text-xs text-ink-subtle">Be the first to say something nice.</p>
              </div>
            ) : (
              <ul className="space-y-3.5">
                {comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2.5">
                    <a href={c.profiles?.handle ? `/profile/${c.profiles.handle}` : undefined} className={cn('shrink-0', !c.profiles?.handle && 'pointer-events-none')}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.profiles?.avatar_url || '/default-avatar.png'} alt="" className="h-7 w-7 rounded-full object-cover" />
                    </a>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold text-ink-strong">{c.profiles?.display_name ?? c.profiles?.handle ?? 'User'}</span>{' '}
                        <span className="text-ink">{c.comment}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">{timeAgo(c.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action bar */}
          <div className="flex shrink-0 items-center gap-1 border-t border-line px-2 py-2">
            <button type="button" onClick={toggleLike} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'}
              className={cn('group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-surface-sunken',
                liked ? 'text-danger' : 'text-ink-muted hover:text-ink')}>
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] transition-transform group-active:scale-90" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount > 0 && <span className="tabular">{likeCount}</span>}
            </button>
            <button type="button" onClick={focusComposer} aria-label="Comment"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-muted transition hover:bg-surface-sunken hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
              </svg>
              {comments.length > 0 && <span className="tabular">{comments.length}</span>}
            </button>
            <button type="button" onClick={share} aria-label="Share"
              className="ml-auto inline-flex items-center justify-center rounded-full px-3 py-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
              </svg>
            </button>
          </div>

          {/* Composer */}
          {viewerId ? (
            <form
              className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)]"
              onSubmit={(e) => { e.preventDefault(); void submitComment(); }}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                className="min-w-0 flex-1 rounded-full bg-surface-sunken px-4 py-2 text-sm outline-none transition focus:bg-surface focus:ring-2 focus:ring-brand-200 placeholder:text-ink-subtle"
              />
              <button type="submit" disabled={!draft.trim() || submitting}
                className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent">
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </form>
          ) : (
            <div className="shrink-0 border-t border-line px-4 py-3 text-center text-xs text-ink-subtle">Log in to like or comment.</div>
          )}
        </aside>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default PostViewerModal;
