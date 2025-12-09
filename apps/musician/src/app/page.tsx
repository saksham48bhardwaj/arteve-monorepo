'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [bits, setBits] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Comment modal
  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState("");
  const [viewCommentsPost, setViewCommentsPost] = useState<Post | null>(null);

  // ----------------------------------------------------
  // Fetch all posts (used on load + after like/comment)
  // ----------------------------------------------------
  async function fetchPosts() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from('posts')
        .select(`
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
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const allPosts = (data ?? []) as unknown as Post[];
      const bitPosts = allPosts.filter((p) => p.is_bit === true);
      const feedPosts = allPosts.filter((p) => p.is_bit === false);

      setBits(bitPosts);
      setPosts(feedPosts);
    } catch (err) {
      console.error(err);
      setErrorMsg("Unable to load posts right now.");
      setBits([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    fetchPosts();
  }, []);

  // ----------------------------------------------------
  // LIKE / UNLIKE
  // ----------------------------------------------------
  async function toggleLike(postId: number) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const post = posts.find((p) => p.id === postId);
    const alreadyLiked = post?.post_likes?.some((l) => l.user_id === userId);

    if (alreadyLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
    } else {
      await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: userId,
      });
    }

    await fetchPosts();
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

    await supabase.from("post_comments").insert({
      post_id: commentModalPost.id,
      user_id: userId,
      comment: newComment.trim(),
    });

    setNewComment("");
    setCommentModalPost(null);
    await fetchPosts();
  }

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

      {/* Featured Bits */}
      {bits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
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
            {bits.slice(0, 8).map((post) => (
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
                    alt={post.caption ?? ""}
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
        <h2 className="text-sm font-semibold text-slate-800">
          Latest from the community
        </h2>

        {loading && (
          <div className="space-y-4">
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

        {errorMsg && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {!loading &&
          !errorMsg &&
          posts.map((post) => {
            const likesCount = post.post_likes?.length ?? 0;
            const commentsCount = post.post_comments_count?.[0]?.count ?? 0;

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-4">
                  <Link
                    href={`/profile/${post.profiles?.handle ?? ""}`}
                    className="mb-3 flex items-center gap-3"
                  >
                    <img
                      src={post.profiles?.avatar_url ?? "/default-avatar.png"}
                      className="h-9 w-9 rounded-full object-cover"
                      alt="avatar"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {post.profiles?.display_name || "Arteve musician"}
                      </p>
                    </div>
                  </Link>

                  {post.caption && (
                    <p className="mb-3 text-sm text-slate-800">
                      {post.caption}
                    </p>
                  )}
                </div>

                {/* Clicking post does nothing now */}
                {post.media_type === "video" ? (
                  <video
                    className="w-full max-h-[480px] bg-black object-cover"
                    src={post.media_url}
                    controls
                  />
                ) : (
                  <img
                    className="w-full max-h-[480px] object-cover"
                    src={post.media_url}
                    alt={post.caption ?? ""}
                  />
                )}

                <div className="flex items-center gap-5 px-4 py-3 text-xs text-slate-500">
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

                {/* VIEW ALL COMMENTS MODAL */}
                {viewCommentsPost && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">

                      <h2 className="text-lg font-semibold">
                        All comments on {viewCommentsPost.profiles?.display_name}
                      </h2>

                      <div className="space-y-4">
                        {viewCommentsPost.post_comments?.map((c) => (
                          <div key={c.id} className="flex items-start gap-3 text-sm">
                            <Link href={`/profile/${c.profiles?.handle ?? ""}`} className="flex-shrink-0">
                              <img
                                src={c.profiles?.avatar_url ?? "/default-avatar.png"}
                                className="w-8 h-8 rounded-full object-cover"
                                alt="avatar"
                              />
                            </Link>

                            <div>
                              <Link
                                href={`/profile/${c.profiles?.handle ?? ""}`}
                                className="font-medium text-slate-900"
                              >
                                {c.profiles?.display_name ?? "User"}
                              </Link>

                              <p className="text-slate-700">{c.comment}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => setViewCommentsPost(null)}
                          className="px-4 py-2 text-sm rounded-lg bg-slate-200"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* COMMENTS DISPLAY */}
                  {post.post_comments && post.post_comments.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      {post.post_comments.slice(0, 2).map((c) => (
                        <div key={c.id} className="flex items-start gap-3 text-sm">
                          <Link href={`/profile/${c.profiles?.handle ?? ""}`} className="flex-shrink-0">
                            <img
                              src={c.profiles?.avatar_url ?? "/default-avatar.png"}
                              className="w-7 h-7 rounded-full object-cover"
                              alt="avatar"
                            />
                          </Link>

                          <div>
                            <Link
                              href={`/profile/${c.profiles?.handle ?? ""}`}
                              className="font-medium text-slate-900"
                            >
                              {c.profiles?.display_name ?? "User"}
                            </Link>
                            <p className="text-slate-700">{c.comment}</p>
                          </div>
                        </div>
                      ))}

                      {(post.post_comments_count?.[0]?.count ?? 0) > 2 && (
                        <button
                          className="text-xs text-blue-600 font-medium"
                          onClick={() => setViewCommentsPost(post)}
                        >
                          View all {(post.post_comments_count?.[0]?.count ?? 0)} comments
                        </button>
                      )}
                    </div>
                  )}
              </article>
            );
          })}
      </section>

      {/* COMMENT MODAL */}
      {commentModalPost && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold">
              Comment on {commentModalPost.profiles?.display_name}
            </h2>

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full h-28 border rounded-lg p-3 text-sm"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCommentModalPost(null)}
                className="px-4 py-2 text-sm rounded-lg bg-slate-200"
              >
                Cancel
              </button>

              <button
                onClick={addComment}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white"
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
