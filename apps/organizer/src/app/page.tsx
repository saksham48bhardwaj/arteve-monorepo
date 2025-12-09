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

export default function OrganizerHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [bits, setBits] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState("");
  const [viewCommentsPost, setViewCommentsPost] = useState<Post | null>(null);

  // ---------------------------------------------------------
  // Fetch posts
  // ---------------------------------------------------------
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
            profiles:profiles!user_id(
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
      setErrorMsg("Unable to load content right now.");
      setBits([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  // ---------------------------------------------------------
  // Like
  // ---------------------------------------------------------
  async function toggleLike(postId: number) {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;

    const p = posts.find((x) => x.id === postId);
    const alreadyLiked = p?.post_likes?.some((l) => l.user_id === userId);

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

  // ---------------------------------------------------------
  // Add comment
  // ---------------------------------------------------------
  async function addComment() {
    if (!commentModalPost) return;

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
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
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover Musicians</h1>
          <p className="mt-1 text-sm text-slate-500">
            Scroll recent performances & shortlist artists for your next event.
          </p>
        </div>
      </header>

      {/* Featured Bits */}
      {bits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">
              Featured Bits
            </h2>
            <button className="text-xs text-slate-500">See all</button>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
            {bits.slice(0, 8).map((post) => (
              <article
                key={post.id}
                className="relative h-52 w-40 shrink-0 overflow-hidden rounded-2xl bg-black"
              >
                {post.media_type === "video" ? (
                  <video src={post.media_url} className="h-full w-full object-cover" muted loop playsInline />
                ) : (
                  <img src={post.media_url} className="h-full w-full object-cover" />
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-3">
                  {post.caption && <p className="text-xs text-white line-clamp-2">{post.caption}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Feed */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Recent performances</h2>

        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse border rounded-2xl p-4">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-48 bg-slate-200 rounded mt-3" />
              </div>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-red-50 border px-4 py-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {!loading &&
          posts.map((post) => {
            const likes = post.post_likes?.length ?? 0;
            const comments = post.post_comments_count?.[0]?.count ?? 0;

            return (
              <article
                key={post.id}
                className="rounded-2xl border bg-white shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <Link
                    href={`/profile/${post.profiles?.handle ?? ""}`}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={post.profiles?.avatar_url ?? "/default-avatar.png"}
                      className="h-9 w-9 rounded-full object-cover"
                    />

                    <div>
                      <p className="font-medium text-sm">
                        {post.profiles?.display_name ?? "Musician"}
                      </p>
                      <p className="text-xs text-slate-500">Tap to view full profile</p>
                    </div>
                  </Link>

                  {post.caption && (
                    <p className="mt-3 text-sm text-slate-800">{post.caption}</p>
                  )}
                </div>

                {/* Clicking post does nothing */}
                {post.media_type === "video" ? (
                  <video className="w-full max-h-[480px] object-cover bg-black" src={post.media_url} controls />
                ) : (
                  <img className="w-full max-h-[480px] object-cover" src={post.media_url} />
                )}

                <div className="flex items-center gap-5 px-4 py-3 text-xs text-slate-600">
                  <button onClick={() => toggleLike(post.id)}>👍 {likes}</button>

                  <button onClick={() => setCommentModalPost(post)}>💬 {comments}</button>

                  <button className="ml-auto text-blue-600 font-medium">
                    Shortlist
                  </button>
                </div>

                {/* Inline Comments */}
                {post.post_comments && post.post_comments.length > 0 && (
                  <div className="px-4 pb-4 space-y-2">
                    {post.post_comments.slice(0, 2).map((c) => (
                      <div key={c.id} className="flex items-start gap-3 text-sm">
                        <Link href={`/profile/${c.profiles?.handle ?? ""}`}>
                          <img
                            src={c.profiles?.avatar_url ?? "/default-avatar.png"}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        </Link>

                        <div>
                          <Link
                            href={`/profile/${c.profiles?.handle ?? ""}`}
                            className="font-medium"
                          >
                            {c.profiles?.display_name}
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
                        View all {post.post_comments_count?.[0]?.count} comments
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
      </section>

      {/* VIEW ALL COMMENTS */}
      {viewCommentsPost && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-semibold">
              All comments on {viewCommentsPost.profiles?.display_name}
            </h2>

            {viewCommentsPost.post_comments?.map((c) => (
              <div key={c.id} className="flex items-start gap-3 text-sm">
                <Link href={`/profile/${c.profiles?.handle ?? ""}`}>
                  <img
                    src={c.profiles?.avatar_url ?? "/default-avatar.png"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </Link>

                <div>
                  <Link
                    href={`/profile/${c.profiles?.handle ?? ""}`}
                    className="font-medium text-slate-900"
                  >
                    {c.profiles?.display_name}
                  </Link>
                  <p className="text-slate-700">{c.comment}</p>
                </div>
              </div>
            ))}

            <button
              onClick={() => setViewCommentsPost(null)}
              className="mt-4 px-4 py-2 bg-slate-200 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ADD COMMENT MODAL */}
      {commentModalPost && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
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
                className="px-4 py-2 bg-slate-200 rounded-lg text-sm"
              >
                Cancel
              </button>

              <button
                onClick={addComment}
                className="px-4 py-2 bg-blue-600 rounded-lg text-sm text-white"
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
