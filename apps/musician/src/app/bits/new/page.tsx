'use client';

import { useState, ChangeEvent, FormEvent, useEffect, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Button, Textarea, Spinner } from '@arteve/ui/components';

const MAX_CAPTION = 1500;

export default function NewBitPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push('/login');
    })();
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function setSelectedFile(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
    setErrorMsg(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setSelectedFile(f);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    if (!file) {
      setErrorMsg('Please choose a clip to upload.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error('You must be logged in to post.');

      const profileId = user.id;
      const ext = file.name.split('.').pop();
      const fileName = `${profileId}-${Date.now()}.${ext}`;
      const filePath = `profiles/${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const mediaUrl = publicUrlData.publicUrl;
      const mediaType: 'video' | 'audio' | 'image' = file.type.startsWith('video')
        ? 'video'
        : file.type.startsWith('audio')
        ? 'audio'
        : 'image';

      const { error: postErr } = await supabase.from('posts').insert({
        profile_id: profileId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption || null,
        kind: 'bit',
      });
      if (postErr) throw postErr;

      router.push('/bits');
    } catch (err: unknown) {
      console.error('NEW BIT ERROR:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to publish your bit.');
    } finally {
      setSubmitting(false);
    }
  }

  const isVideo = file?.type.startsWith('video');
  const isAudio = file?.type.startsWith('audio');

  return (
    <main className="w-full mx-auto pb-24" style={{ maxWidth: 720 }}>
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 px-4 py-3 border-b border-line">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/post"
            aria-label="Back"
            className="inline-flex h-9 w-9 -ml-1 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-ink-strong">New bit</h1>
          <Button size="sm" type="submit" form="bit-form" loading={submitting} disabled={!file}>
            Publish
          </Button>
        </div>
      </header>

      <form id="bit-form" onSubmit={handleSubmit} className="px-4 md:px-6 pt-5 space-y-5">
        {/* Picker / Preview */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            className={`mx-auto flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition cursor-pointer text-center ${
              dragging ? 'border-brand bg-brand-50' : 'border-line-strong hover:border-ink-disabled hover:bg-surface-sunken'
            }`}
            style={{ aspectRatio: '9 / 16', maxWidth: 300, width: '100%' }}
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div className="px-6">
              <p className="text-sm font-semibold text-ink-strong">Tap or drop to upload</p>
              <p className="text-xs text-ink-muted mt-1">Vertical 9:16 video works best</p>
            </div>
            <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="mx-auto relative rounded-2xl overflow-hidden border border-line bg-black" style={{ aspectRatio: '9 / 16', maxWidth: 360, width: '100%' }}>
            {isVideo ? (
              <video src={previewUrl ?? undefined} className="h-full w-full object-cover" controls playsInline />
            ) : isAudio ? (
              <div className="h-full w-full p-6 bg-[linear-gradient(135deg,var(--brand-700),var(--brand-500),var(--accent-500))] text-white flex flex-col items-center justify-center gap-3">
                <svg viewBox="0 0 24 24" className="h-12 w-12 opacity-90" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                <audio src={previewUrl ?? undefined} controls className="w-full max-w-xs" />
              </div>
            ) : (
              <img src={previewUrl ?? undefined} alt="Preview" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              aria-label="Remove file"
              className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 text-white transition"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 hover:bg-black/75 text-white px-3 py-1.5 text-xs font-semibold transition"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 16.5V19a2 2 0 0 0 2 2h2.5M21 7.5V5a2 2 0 0 0-2-2h-2.5M3 7.5V5a2 2 0 0 1 2-2h2.5M21 16.5V19a2 2 0 0 1-2 2h-2.5" />
                <path d="M8 12h8" />
              </svg>
              Replace
            </button>
            <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* Caption */}
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <label htmlFor="bit-caption" className="label !mb-0">Caption</label>
            <span className={`text-[11px] tabular ${caption.length > MAX_CAPTION ? 'text-danger' : 'text-ink-subtle'}`}>
              {caption.length}/{MAX_CAPTION}
            </span>
          </div>
          <Textarea
            id="bit-caption"
            rows={3}
            maxLength={MAX_CAPTION}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a short caption…"
          />
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2 text-xs font-medium text-danger flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMsg}
          </div>
        )}

        <div className="md:hidden">
          <Button type="submit" fullWidth size="lg" loading={submitting} disabled={!file}>
            Publish bit
          </Button>
        </div>

        <p className="text-[11px] text-ink-subtle text-center">
          By posting, you agree to Arteve&apos;s community guidelines.
        </p>
      </form>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40 backdrop-blur-sm">
          <div className="rounded-xl bg-surface px-5 py-4 shadow-xl flex items-center gap-3">
            <Spinner size={18} />
            <span className="text-sm font-medium text-ink-strong">Uploading…</span>
          </div>
        </div>
      )}
    </main>
  );
}
