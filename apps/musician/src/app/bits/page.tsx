'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';

/* ============================================================
   TYPES
   ============================================================ */
type ProfileInfo = {
  display_name: string | null;
  avatar_url: string | null;
};

type Bit = {
  id: number;
  media_url: string;
  caption: string | null;
  created_at: string;
  profile_id: string;
  profiles: ProfileInfo | null;
  likes: number;
  has_liked: boolean;
};

type RawComment = {
  id: number;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: ProfileInfo[] | ProfileInfo | null;
};

type Comment = {
  id: number;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: ProfileInfo;
};

/* ============================================================
   COMPONENT
   ============================================================ */
export default function BitsReelsPage() {
  const [rows, setRows] = useState<Bit[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentOpenFor, setCommentOpenFor] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  /* ============================================================
     LOAD ALL BITS + LIKES
     ============================================================ */
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;

      const { data: bits } = await supabase
        .from('posts')
        .select(
          `id, media_url, caption, created_at, profile_id,
           profiles ( display_name, avatar_url )`
        )
        .eq('kind', 'bit')
        .order('created_at', { ascending: false });

      if (!bits) return;

      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id, user_id');

      const enriched = bits.map((bit) => {
        const bitLikes = likes?.filter((l) => l.post_id === bit.id) ?? [];

        return {
          ...bit,
          profiles: Array.isArray(bit.profiles)
            ? bit.profiles[0]
            : bit.profiles,
          likes: bitLikes.length,
          has_liked: bitLikes.some((l) => l.user_id === uid),
        };
      });

      setRows(enriched as Bit[]);
    })();
  }, []);

  /* ============================================================
     AUTOPLAY (IG Reels)
     ============================================================ */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const videos = Array.from(container.querySelectorAll('video'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) vid.play();
          else vid.pause();
        });
      },
      { threshold: 0.85 }
    );

    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [rows]);

  /* ============================================================
     LIKE / UNLIKE
     ============================================================ */
  async function toggleLike(bit: Bit) {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;

    if (bit.has_liked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', bit.id)
        .eq('user_id', uid);

      setRows((prev) =>
        prev.map((i) =>
          i.id === bit.id
            ? { ...i, has_liked: false, likes: i.likes - 1 }
            : i
        )
      );
    } else {
      await supabase.from('post_likes').insert({ post_id: bit.id, user_id: uid });

      setRows((prev) =>
        prev.map((i) =>
          i.id === bit.id
            ? { ...i, has_liked: true, likes: i.likes + 1 }
            : i
        )
      );
    }
  }

  /* ============================================================
     LOAD COMMENTS
     ============================================================ */
  async function openComments(bitId: number) {
    setCommentOpenFor(bitId);

    const { data } = await supabase
      .from('post_comments')
      .select(
        `id, user_id, comment, created_at,
         profiles!post_comments_user_id_fkey (
           display_name,
           avatar_url
         )`
      )
      .eq('post_id', bitId)
      .order('created_at', { ascending: true });

    const mapped: Comment[] =
      (data ?? []).map((item) => ({
        ...item,
        profiles: (Array.isArray(item.profiles) ? item.profiles[0] : item.profiles) ?? {
          display_name: null,
          avatar_url: null,
        },
      }));

    setComments(mapped);
  }

  /* ============================================================
     SEND COMMENT
     ============================================================ */
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

  /* ============================================================
     UI
     ============================================================ */
  return (
    <>
      {/* MAIN FEED */}
      <div
        ref={containerRef}
        className="w-full h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
      >
        {rows.map((b) => (
          <section
            key={b.id}
            className="h-screen w-full relative flex justify-center items-center snap-start"
          >
            <video
              src={b.media_url}
              muted
              loop
              playsInline
              className="h-full w-auto object-contain"
            />

            {/* Artist Info */}
            <div className="absolute bottom-24 left-5 text-white space-y-2 drop-shadow-md">
              <div className="flex items-center gap-2">
                <img
                  src={b.profiles?.avatar_url ?? '/placeholder-avatar.png'}
                  className="w-10 h-10 rounded-full"
                />
                <div className="text-sm font-semibold">
                  {b.profiles?.display_name ?? 'Artist'}
                </div>
              </div>
              {b.caption && (
                <p className="text-sm max-w-xs">{b.caption}</p>
              )}
            </div>

            {/* Right Action Bar */}
            <div className="absolute right-6 bottom-28 flex flex-col items-center gap-6 text-white">
              {/* LIKE */}
              <button
                onClick={() => toggleLike(b)}
                className="flex flex-col items-center"
              >
                <span
                  className={`text-3xl ${
                    b.has_liked ? 'text-red-500 scale-110' : ''
                  } transition-transform`}
                >
                  ❤️
                </span>
                <span className="text-xs font-medium">{b.likes}</span>
              </button>

              {/* COMMENTS */}
              <button
                onClick={() => openComments(b.id)}
                className="flex flex-col items-center"
              >
                <span className="text-3xl">💬</span>
                <span className="text-xs">Comments</span>
              </button>

              {/* SHARE */}
              <button
                onClick={() =>
                  navigator.share?.({
                    title: 'Check this bit',
                    url: `${location.origin}/bits/${b.id}`,
                  }) ||
                  navigator.clipboard.writeText(
                    `${location.origin}/bits/${b.id}`
                  )
                }
                className="flex flex-col items-center"
              >
                <span className="text-3xl">🔗</span>
              </button>
            </div>
          </section>
        ))}
      </div>

      {/* COMMENT SHEET */}
      {commentOpenFor !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-50">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 h-[65vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Comments</h2>

            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <img
                    src={c.profiles.avatar_url ?? '/placeholder-avatar.png'}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {c.profiles.display_name ?? 'User'}
                    </p>
                    <p className="text-sm">{c.comment}</p>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-gray-500 text-sm">No comments yet.</p>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 border rounded-full px-3 py-2 text-sm"
                placeholder="Add a comment…"
              />
              <button
                onClick={sendComment}
                className="px-4 py-2 bg-black text-white rounded-full text-sm"
              >
                Send
              </button>
            </div>

            <button
              onClick={() => setCommentOpenFor(null)}
              className="text-gray-500 text-center w-full py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
