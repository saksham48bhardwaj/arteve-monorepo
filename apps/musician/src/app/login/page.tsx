'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';
import { Button, Input } from '@arteve/ui/components';

function generateRandomHandle(prefix = 'artist') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleForgotPassword() {
    if (!email) {
      setMsg('Please enter your email first');
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setMsg(error.message);
    else setResetSent(true);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            role: 'musician',
            handle: generateRandomHandle('artist'),
          });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.push('/profile');
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface-muted">
      {/* Hero — desktop */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image src="/images/hero.png" alt="Musician performing" fill className="object-cover" priority />
        <div className="relative z-10 flex flex-col justify-end w-full px-10 lg:px-16 py-12 bg-gradient-to-t from-ink-strong/85 via-ink-strong/55 to-transparent">
          <h1 className="text-3xl lg:text-4xl font-semibold text-white max-w-xl leading-tight">
            Grow your music career with the right gigs.
          </h1>
          <p className="mt-4 text-base text-white/85 max-w-xl">
            Manage your profile, showcase performances, and connect with organizers looking for artists like you.
          </p>
          <p className="mt-10 text-xs text-white/65 uppercase tracking-[0.18em]">
            Arteve · Connecting artists &amp; venues
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10 bg-[linear-gradient(135deg,var(--brand-50)_0%,var(--surface)_50%,var(--accent-50)_100%)]">
        <div className="w-full max-w-md">
          <div className="card-elevated p-7 sm:p-9 rounded-2xl bg-surface/95 backdrop-blur">
            <div className="mb-6 flex flex-col items-center text-center">
              <Image src="/images/arteve_logo.png" alt="Arteve" width={140} height={36} className="mb-4" />
              <p className="text-sm text-ink-muted max-w-sm">
                Connecting artists and venues for better gigs and collaborations.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center rounded-full border border-line bg-surface-sunken p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`px-4 py-1.5 rounded-full transition ${mode === 'signin' ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`px-4 py-1.5 rounded-full transition ${mode === 'signup' ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Create account
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-ink-subtle hover:text-ink-muted transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3-11-8 1.21-3.06 3.34-5.44 6-6.67" />
                        <path d="M1 1l22 22" />
                        <path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                }
              />

              {msg && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2 text-xs text-danger">
                  {msg}
                </div>
              )}

              {resetSent && (
                <div className="rounded-xl border border-success/30 bg-success/5 px-3.5 py-2 text-xs text-success">
                  Password reset link sent. Check your email.
                </div>
              )}

              <Button type="submit" loading={loading} fullWidth size="lg">
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </Button>

              {mode === 'signin' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <p className="text-[11px] leading-relaxed text-ink-subtle text-center pt-1">
                By continuing, you agree to Arteve&apos;s&nbsp;
                <span className="underline underline-offset-2">terms of use</span>{' '}
                and{' '}
                <span className="underline underline-offset-2">privacy policy</span>.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
