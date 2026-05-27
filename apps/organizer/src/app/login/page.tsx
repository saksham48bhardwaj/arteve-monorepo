'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Button, Input, toast } from '@arteve/ui/components';
import { authErrorMessage, passwordStrength } from '@/lib/auth-errors';

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

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.32A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.93A9 9 0 0 0 0 9c0 1.45.35 2.83.93 4.04l3.04-2.32z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .93 4.96L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" />
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

  async function handleGoogle() {
    clearMessages();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // No need to setLoading(false) — we're redirecting away on success
    if (error) {
      setErrMsg(authErrorMessage(error));
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    clearMessages();
    if (!email) { setErrMsg('Enter your email first.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setErrMsg(authErrorMessage(error));
    } else {
      setInfoMsg(`Magic link sent to ${email}. Click it to sign in — no password needed.`);
    }
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
    <main className="min-h-screen flex flex-col md:flex-row bg-surface-muted">
      {/* Hero — desktop only */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image src="/images/hero.png" alt="Crowd enjoying a live performance" fill className="object-cover" priority />
        {/* Brand wash overlay so the white form on the right doesn't feel orphaned */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-700/55 via-brand-500/20 to-transparent mix-blend-multiply" />
        <div className="relative z-10 flex flex-col justify-between w-full px-10 lg:px-16 py-12 bg-gradient-to-t from-ink-strong/85 via-ink-strong/35 to-transparent">
          <Image src="/images/arteve_logo.png" alt="Arteve" width={120} height={32} className="brightness-0 invert opacity-90" />
          <div>
            <h1 className="text-3xl lg:text-[44px] font-display tracking-[-0.02em] text-white max-w-xl leading-[1.05]">
              Book the right artist for every night.
            </h1>
            <p className="mt-5 text-base lg:text-lg text-white/90 max-w-lg leading-relaxed">
              Discover artists, build lineups, and run your events from one clean dashboard.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-accent-500 ring-2 ring-white/90" />
                <div className="h-8 w-8 rounded-full bg-brand-400 ring-2 ring-white/90" />
                <div className="h-8 w-8 rounded-full bg-surface ring-2 ring-white/90" />
              </div>
              <p className="text-xs text-white/75 uppercase tracking-[0.18em]">
                Built for venues, festivals &amp; agencies
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12 bg-[linear-gradient(135deg,var(--brand-50)_0%,var(--surface)_45%,var(--accent-50)_100%)]">
        {/* Decorative soft blobs (CSS only, no extra assets) */}
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent-200/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="card-elevated rounded-3xl bg-surface/95 backdrop-blur-md shadow-[0_20px_60px_-15px_rgba(28,26,23,0.18)] border border-line/60 px-6 py-7 sm:px-8 sm:py-9">
            {/* Logo (mobile only, since desktop hero already shows it) */}
            <div className="flex md:hidden justify-center mb-5">
              <Image src="/images/arteve_logo.png" alt="Arteve" width={120} height={30} />
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h2 className="text-[26px] sm:text-[28px] font-display tracking-tight text-ink-strong leading-tight">
                {heading}
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted">{subheading}</p>
            </div>

            {/* Segmented mode toggle (hidden in forgot mode) */}
            {!isForgot && (
              <div className="mb-5 flex p-1 rounded-full border border-line bg-surface-sunken">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); clearMessages(); }}
                  className={
                    'flex-1 py-2 rounded-full text-sm font-medium transition ' +
                    (mode === 'signin'
                      ? 'bg-surface text-ink-strong shadow-sm'
                      : 'text-ink-muted hover:text-ink')
                  }
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); clearMessages(); }}
                  className={
                    'flex-1 py-2 rounded-full text-sm font-medium transition ' +
                    (mode === 'signup'
                      ? 'bg-surface text-ink-strong shadow-sm'
                      : 'text-ink-muted hover:text-ink')
                  }
                >
                  Create account
                </button>
              </div>
            )}

            {/* OAuth + magic link section (hidden in forgot mode) */}
            {!isForgot && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-strong hover:bg-surface-sunken hover:border-line-strong transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleGlyph />
                  Continue with Google
                </button>
                <div className="relative flex items-center text-[11px] uppercase tracking-[0.15em] text-ink-subtle py-1">
                  <span className="flex-1 border-t border-line" />
                  <span className="px-3">or with email</span>
                  <span className="flex-1 border-t border-line" />
                </div>
              </div>
            )}

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
                    <div className="flex items-center gap-2 -mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
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
                      <span className="text-[11px] font-medium text-ink-muted w-14 text-right capitalize">
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

              {/* Magic link option (sign-in mode only) */}
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading}
                  className="w-full text-center text-xs font-medium text-ink-muted hover:text-ink-strong disabled:opacity-50 -mt-1"
                >
                  Or email me a magic link instead →
                </button>
              )}

              {/* Footer row */}
              <div className="flex items-center justify-between text-xs font-medium pt-0.5">
                {mode === 'signin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); clearMessages(); }}
                      className="text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                    <span className="text-ink-subtle">New? Use Create account ↑</span>
                  </>
                )}
                {mode === 'signup' && (
                  <>
                    <span className="text-ink-subtle">Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => { setMode('signin'); clearMessages(); }}
                      className="text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
                {isForgot && (
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); clearMessages(); }}
                    className="text-brand-700 hover:text-brand-800 hover:underline ml-auto"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Terms + privacy — outside the card so it feels like a footer */}
          <p className="text-[11px] leading-relaxed text-ink-subtle text-center mt-5 max-w-sm mx-auto">
            By {mode === 'signup' ? 'creating an account' : 'continuing'}, you agree to Arteve&apos;s{' '}
            <Link href="/terms" className="text-ink underline underline-offset-2 hover:text-ink-strong">Terms of Use</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-ink underline underline-offset-2 hover:text-ink-strong">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
