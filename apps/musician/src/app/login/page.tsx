'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';

function generateRandomHandle(prefix = 'artist') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (mode === 'signup') {
        // 1️⃣ Create auth user
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (signUpError) throw signUpError;

        // 2️⃣ Ensure session exists
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;

        // 3️⃣ Create profile with random handle
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const randomHandle = generateRandomHandle('artist');

          await supabase.from('profiles').upsert({
            id: user.id,
            role: 'musician',
            handle: randomHandle,
          });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      // 3️⃣ verify we have a session and cookie is written
      const { data } = await supabase.auth.getSession();
      console.log('SESSION AFTER LOGIN →', data.session);

      router.push('/profile');
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#F5F7FA] text-[#333]">
      {/* Desktop left hero */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image
          src="/images/hero.png"
          alt="Musician performing on stage"
          fill
          className="object-cover"
          priority
        />
        <div className="relative z-10 flex flex-col justify-between w-full px-10 lg:px-14 py-8 bg-gradient-to-t from-black/75 via-black/50 to-black/30 justify-center">
          <div>
            <h1 className="mt-6 text-3xl lg:text-4xl font-semibold text-white">
              Grow your music career with the right gigs.
            </h1>
            <p className="mt-4 lg:text-base text-white/80 max-w-xl">
              Manage your profile, showcase your performances, and connect with organizers who are looking for artists like you.
            </p>
          </div>
          <p className="mt-8 text-xs text-white/65">
            Arteve · Connecting artists &amp; venues
          </p>
        </div>
      </section>

      {/* Right side: form (mobile + desktop) */}
      <section className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10 bg-[linear-gradient(120deg,_#4E7FA2,_white,_#FFE3CC)]">
        <div className="w-full max-w-md">
          {/* Card with toggle + form */}
          <div className="rounded-3xl bg-white/95 border border-white/80 shadow-md shadow-black/5 backdrop-blur-sm px-6 py-7 sm:px-8 sm:py-8">
            {/* Mode toggle */}
            <div className="mb-4">
              <Image
                src="/images/arteve_logo.png"
                alt="Arteve Musician"
                width={200}
                height={40}
                className="mx-auto mt-2 mb-8"
              />
              <p className="mt-1.5 text-[#666] text-center">
                Connecting artists &amp; venues for better gigs and
                collaborations.
              </p>
            </div>
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium p-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`px-4 py-1.5 rounded-full transition-all ${
                    mode === 'signin'
                      ? 'bg-[#4E7FA2] text-white shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`px-4 py-1.5 rounded-full transition-all ${
                    mode === 'signup'
                      ? 'bg-[#4E7FA2] text-white shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Create account
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block font-medium text-[#333]">
                  Email
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#333] placeholder:text-slate-400 outline-none transition focus:border-[#4E7FA2] focus:bg-white focus:ring-2 focus:ring-[#4E7FA2]/15"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-medium text-[#333]">
                  Password
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#333] placeholder:text-slate-400 outline-none transition focus:border-[#4E7FA2] focus:bg-white focus:ring-2 focus:ring-[#4E7FA2]/15"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                />
              </div>

              {msg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-[#4E7FA2] px-4 py-2.75 font-medium text-white shadow-sm transition hover:bg-[#406785] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
              </button>

              <p className="text-[11px] leading-relaxed text-slate-500 text-center">
                By continuing, you agree to Arteve&apos;s&nbsp;
                <span className="underline underline-offset-2">
                  terms of use
                </span>{' '}
                and{' '}
                <span className="underline underline-offset-2">
                  privacy policy
                </span>
                .
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
