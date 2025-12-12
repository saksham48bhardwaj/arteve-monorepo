'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

export default function NewBitPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ensure user is logged in
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push('/login');
    })();
  }, [router]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!file) {
      setErrorMsg('Please choose a vertical video.');
      return;
    }

    if (!file.type.startsWith('video')) {
      setErrorMsg('Bits must be videos.');
      return;
    }

    try {
      setSubmitting(true);

      // 1️⃣ Get user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error('You must be logged in to post.');

      const profileId = user.id;

      // 2️⃣ Upload video
      const ext = file.name.split('.').pop();
      const fileName = `${profileId}-${Date.now()}.${ext}`;
      const filePath = `profiles/${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3️⃣ Public URL
      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
        console.log("BIT UPLOAD PATH:", filePath);

      const mediaUrl = publicUrlData.publicUrl;

      // 4️⃣ Insert as a BIT
      const { error: postErr } = await supabase.from('posts').insert({
        profile_id: profileId,
        media_url: mediaUrl,
        media_type: 'video',
        caption: caption || null,
        kind: 'bit', // <–– THIS IS IMPORTANT
      });

      if (postErr) throw postErr;

      router.push('/');
    } catch (err: unknown) {
      console.error('NEW BIT ERROR:', err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to publish your bit.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <h1 className="text-xl font-semibold">New Bit</h1>
      <p className="text-sm text-gray-500">Upload a short vertical clip.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview */}
        <div className="rounded-2xl border px-6 py-6 flex flex-col items-center gap-4">
          {previewUrl ? (
            <video
              src={previewUrl}
              className="max-h-80 rounded-xl border"
              controls
            />
          ) : (
            <div className="h-40 w-full max-w-md rounded-xl border border-dashed flex items-center justify-center text-sm text-gray-500">
              Choose a vertical video to get started.
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm hover:bg-gray-50">
            Choose video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Caption</label>
          <textarea
            className="w-full rounded-2xl border px-3.5 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black/5"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a short caption…"
          />
        </div>

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Publishing…' : 'Publish Bit'}
        </button>
      </form>
    </main>
  );
}
