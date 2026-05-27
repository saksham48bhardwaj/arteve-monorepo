'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Button, Input, toast } from '@arteve/ui/components';
import { authErrorMessage, passwordStrength } from '@arteve/shared/auth/errors';

function generateRandomHandle(prefix = 'venue') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3-11-8 1.21-3.06 3.34-5.44 6-6.67" />
      <path d="M1 1l22 22" />
      <path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97" />
    </svg>
  ) : (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type Mode = 'signin' | 'signup' | 'forgot';

export default function OrganizerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const pwStrength = useMemo(
    () => (mode === 'signup' && password ? passwordStrength(password) : null),
    [mode, password],
  );

  function clearMessages() {
    setErrMsg(null);
    setInfoMsg(null);
  }

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    if (!email) { setErrMsg('Please enter your email first.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setErrMsg(authErrorMessage(error));
    } else {
      setInfoMsg(`If an account exists for ${email}, we sent a reset link. Check your inbox (and spam folder).`);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (password.length < 8) {
          throw new Error('Password should be at least 8 characters.');
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) throw signUpError;

        // Supabase returns identities=[] when the email is already registered
        // (security feature to prevent email enumeration). Catch it explicitly.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          throw new Error('An account with this email already exists. Try signing in instead.');
        }

        // If email confirmation is required, no session is created yet
        if (!data.session) {
          setInfoMsg(`Check your inbox — we sent a confirmation link to ${email}. Click it to finish creating your account.`);
          setLoading(false);
          return;
        }

        // Session exists — create profile and route into the app
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role: 'organizer',
            handle: generateRandomHandle('venue'),
          });
        }
        toast.success('Welcome to Arteve.');
        router.push('/profile');
      } else {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/profile');
      }
    } catch (err) {
      setErrMsg(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const isForgot = mode === 'forgot';
  const heading =
    isForgot ? 'Reset your password'
    : mode === 'signup' ? 'Create your account'
    : 'Welcome back';
  const subheading =
    isForgot ? "Enter your email and we'll send you a reset link."
    : mode === 'signup' ? "It only takes a minute. We'll set up your venue profile."
    : 'Sign in to continue to Arteve.';

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface">
      {/* Hero — desktop only */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image src="/images/hero.png" alt="Crowd enjoying a live performance" fill className="object-cover" priority />
        <div className="relative z-10 flex flex-col justify-end w-full px-10 lg:px-16 py-12 bg-gradient-to-t from-ink-strong/90 via-ink-strong/45 to-transparent">
          <h1 className="text-3xl lg:text-4xl font-display tracking-tight text-white max-w-xl leading-[1.1]">
            Book the right artist for every night.
          </h1>
          <p className="mt-4 text-base text-white/85 max-w-xl">
            Discover artists, build lineups, and run your events from one clean dashboard.
          </p>
          <p className="mt-10 text-[11px] text-white/65 uppercase tracking-[0.18em]">
            Arteve · For organizers
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-sm">
          {/* Logo + heading */}
          <div className="flex flex-col items-center text-center mb-7">
            <Image src="/images/arteve_logo.png" alt="Arteve" width={112} height={28} className="mb-6" />
            <h2 className="text-2xl font-display tracking-tight text-ink-strong">{heading}</h2>
            <p className="mt-1.5 text-sm text-ink-muted">{subheading}</p>
          </div>

          {/* Form */}
          <form onSubmit={isForgot ? handleForgotPassword : handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
              required
              autoComplete="email"
              autoFocus
            />

            {!isForgot && (
              <>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="text-ink-subtle hover:text-ink transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <EyeIcon off={showPassword} />
                    </button>
                  }
                />

                {/* Password strength indicator (signup only) */}
                {pwStrength && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-surface-sunken overflow-hidden">
                      <div
                        className={
                          'h-full transition-all duration-200 ' +
                          (pwStrength.label === 'strong' ? 'bg-success w-full'
                          : pwStrength.label === 'good' ? 'bg-success/70 w-3/4'
                          : pwStrength.label === 'fair' ? 'bg-warning w-1/2'
                          : 'bg-danger w-1/4')
                        }
                      />
                    </div>
                    <span className="text-[11px] font-medium text-ink-muted w-12 text-right capitalize">
                      {pwStrength.label}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Messages */}
            {errMsg && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-xs text-danger">
                {errMsg}
              </div>
            )}
            {infoMsg && (
              <div className="rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 text-xs text-success">
                {infoMsg}
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg">
              {isForgot ? 'Send reset link' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>

            {/* Inline mode-switch links */}
            <div className="flex items-center justify-between text-xs font-medium pt-1">
              {mode === 'signin' && (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); clearMessages(); }}
                    className="text-ink-muted hover:text-ink"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); clearMessages(); }}
                    className="text-ink-strong hover:underline"
                  >
                    Create account
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  <span className="text-ink-subtle">Already have one?</span>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); clearMessages(); }}
                    className="text-ink-strong hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
              {isForgot && (
                <>
                  <span />
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); clearMessages(); }}
                    className="text-ink-strong hover:underline"
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Terms + privacy */}
          {!isForgot && (
            <p className="text-[11px] leading-relaxed text-ink-subtle text-center mt-6">
              By {mode === 'signup' ? 'creating an account' : 'continuing'}, you agree to Arteve&apos;s{' '}
              <Link href="/terms" className="underline underline-offset-2 hover:text-ink">terms of use</Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">privacy policy</Link>.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
