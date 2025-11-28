'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      router.push('/profile');
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Organizer Portal
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Sign in to Arteve
          </h1>
          <p className="text-sm text-slate-300">
            Discover talent, manage bookings, and keep every event organized in one place.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-950/40 border border-slate-100">
          {/* Mode toggle */}
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  mode === 'signup'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  mode === 'signin'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Sign in
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900">
                Work email
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900">
                Password
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {msg && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs text-red-700">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signup'
                ? 'Create your organizer account'
                : 'Sign in'}
            </button>

            <p className="text-[11px] leading-relaxed text-slate-500 text-center">
              By continuing, you agree to Arteve&apos;s terms of use and privacy policy.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
