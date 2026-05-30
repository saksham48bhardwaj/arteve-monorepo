'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';
import { Button, Input, Textarea, toast } from '@arteve/ui/components';

export const dynamic = 'force-dynamic';

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic',
  'Folk', 'R&B', 'Country', 'Metal', 'Indie', 'Acoustic',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, location, bio, genres, onboarded_at')
        .eq('id', user.id)
        .maybeSingle();

      // Already onboarded → skip straight to the app
      if (prof?.onboarded_at) { router.replace('/profile'); return; }

      // Prefill, but don't seed the name with their email address
      const seededName = prof?.display_name && !prof.display_name.includes('@')
        ? prof.display_name
        : '';
      setDisplayName(seededName);
      setLocation(prof?.location ?? '');
      setBio(prof?.bio ?? '');
      setGenres(prof?.genres ?? []);
      setChecking(false);
    })();
  }, [router]);

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    if (!displayName.trim()) { toast.error('Please add your name.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        location: location.trim() || null,
        bio: bio.trim() || null,
        genres: genres.length ? genres : null,
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile set up. Welcome to Arteve!');
    router.replace('/profile');
  }

  async function handleSkip() {
    if (!userId) return;
    if (!displayName.trim()) { toast.error('Add at least your name to continue.'); return; }
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), onboarded_at: new Date().toISOString() })
      .eq('id', userId);
    setSaving(false);
    router.replace('/profile');
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-muted">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-brand border-r-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,var(--brand-50)_0%,var(--surface)_45%,var(--accent-50)_100%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <Image src="/images/arteve_logo.png" alt="Arteve" width={112} height={28} className="mb-5" />
          <h1 className="text-[26px] font-display tracking-tight text-ink-strong">Set up your profile</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            A few details so venues and fans can find the real you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-elevated rounded-3xl bg-surface/95 backdrop-blur-md border border-line/60 shadow-[0_20px_60px_-15px_rgba(28,26,23,0.18)] px-6 py-7 space-y-4"
        >
          <Input
            label="Your name or stage name"
            placeholder="e.g. Maya Rivers"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Location"
            placeholder="e.g. Mumbai, India"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-ink-strong mb-1.5">Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => {
                const on = genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={
                      'rounded-full px-3 py-1.5 text-sm font-medium border transition ' +
                      (on
                        ? 'bg-ink-strong text-white border-ink-strong'
                        : 'bg-surface text-ink-muted border-line hover:border-line-strong')
                    }
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label="Short bio"
            placeholder="What do you play, and what makes your sound yours?"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />

          <Button type="submit" loading={saving} fullWidth size="lg">
            Finish setup
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="w-full text-center text-xs font-medium text-ink-muted hover:text-ink-strong disabled:opacity-50"
          >
            Skip for now — I&apos;ll add details later
          </button>
        </form>
      </div>
    </main>
  );
}
