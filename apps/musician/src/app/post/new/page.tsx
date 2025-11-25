'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

export default function NewPostPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
    })();
  }, [router]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { router.push('/login'); return; }

  if (!file) { setErr('Please choose an image or video'); return; }
  setUploading(true); setErr(null);

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    const path = `posts/${user.id}/${Date.now()}.${ext}`;

    // 1) upload to storage
    const { error: upErr } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (upErr) throw upErr;

    // 2) get public URL
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    const media_url = pub.publicUrl;

    // 3) insert row (RLS requires author_id = auth.uid())
    const { error: dbErr } = await supabase.from('posts').insert([{
      author_id: user.id,
      caption: caption || null,
      media_url,
      media_type: mediaType
    }]);
    if (dbErr) throw dbErr;

    // 4) go home
    router.push('/');
  } catch (e:unknown) {
    setErr(e instanceof Error ? e.message : 'Upload failed');
  } finally {
    setUploading(false);
  }
}


  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">New Post</h1>

      <label className="block">
        <span className="text-sm">Image or video</span>
        <input type="file" accept="image/*,video/*" onChange={onFile} className="mt-1" />
      </label>

      {preview && (
        file?.type.startsWith('video') ? (
          <video className="w-full rounded-2xl border" src={preview} controls />
        ) : (
          <img className="w-full rounded-2xl border" src={preview} alt="" />
        )
      )}

      <label className="block">
        <span className="text-sm">Caption</span>
        <textarea className="w-full border p-2 mt-1" rows={3}
                  value={caption} onChange={e=>setCaption(e.target.value)} />
      </label>

      <button onClick={submit} disabled={uploading} className="px-4 py-2 border rounded">
        {uploading ? 'Uploading…' : 'Publish'}
      </button>

      {err && <p className="text-red-600">{err}</p>}
    </main>
  );
}
