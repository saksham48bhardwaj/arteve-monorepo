'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

type Post = {
  id: string; media_url: string; media_type: 'image'|'video';
  caption: string | null; created_at: string;
};

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(()=> {
    (async ()=>{
      supabase.auth.getUser().then(({ data, error }) => {
    console.log('Active user:', data?.user?.id, error);
  });
      const { data } = await supabase
        .from('posts')
        .select('id,media_url,media_type,caption,created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      setPosts((data as Post[]) || []);
    })();
  }, []);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Home</h1>

      <div className="space-y-3">
        {posts.map(p => (
          <div key={p.id} className="rounded-2xl border p-4">
            {p.media_type === 'video' ? (
              <video className="w-full rounded-xl" src={p.media_url} controls />
            ) : (
              <img className="w-full rounded-xl" src={p.media_url} alt="" />
            )}
            {p.caption && <p className="text-sm text-gray-700 mt-2">{p.caption}</p>}
          </div>
        ))}
        {posts.length === 0 && <p className="text-gray-600">No posts yet. Try creating one from the Post tab.</p>}
      </div>
    </section>
  );
}
