'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';
import { Button, Input, Textarea, toast } from '@arteve/ui/components';

export const dynamic = 'force-dynamic';

const VENUE_TYPES = [
  'Bar', 'Club', 'Restaurant', 'Café', 'Concert Hall', 'Festival',
  'Hotel', 'Private Events', 'Wedding', 'Corporate', 'Brewery', 'Lounge',
];

export default function OrganizerOnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [types, setTypes] = useState<string[]>([]);

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

      if (prof?.onboarded_at) { router.replace('/profile'); return; }

      const seededName = prof?.display_name && !prof.display_name.includes('@')
        ? prof.display_name
        : '';
      setDisplayName(seededName);
      setLocation(prof?.location ?? '');
      setBio(prof?.bio ?? '');
      setTypes(prof?.genres ?? []);
      setChecking(false);
    })();
  }, [router]);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    if (!displayName.trim()) { toast.error('Please add your venue or organization name.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        location: location.trim() || null,
        bio: bio.trim() || null,
        genres: types.length ? types : null, // reuse genres[] for venue types
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
    if (!displayName.trim()) { toast.error('Add at least your venue name to continue.'); return; }
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
            A few details so artists know who they&apos;re playing for.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-elevated rounded-3xl bg-surface/95 backdrop-blur-md border border-line/60 shadow-[0_20px_60px_-15px_rgba(28,26,23,0.18)] px-6 py-7 space-y-4"
        >
          <Input
            label="Venue or organization name"
            placeholder="e.g. The Blue Room"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Location"
            placeholder="e.g. Bengaluru, India"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-ink-strong mb-1.5">Venue type</label>
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={
                      'rounded-full px-3 py-1.5 text-sm font-medium border transition ' +
                      (on
                        ? 'bg-ink-strong text-white border-ink-strong'
                        : 'bg-surface text-ink-muted border-line hover:border-line-strong')
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label="About your venue"
            placeholder="What kind of nights do you host, and what are you looking for?"
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
