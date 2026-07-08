'use client';

import { Suspense, useEffect, useState, FormEvent, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';
import { Button, Input } from '@arteve/ui/components';
import { authErrorMessage, passwordStrength } from '@/lib/auth-errors';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Supabase recovery links arrive in two shapes depending on flow:
  //   (1) PKCE: ?code=...
  //   (2) Legacy OTP: ?token=...&type=recovery&email=...
  // We handle both and also fall back to detecting an existing session set by
  // the Supabase client's auto-detect-in-URL behavior.
  const code = searchParams.get('code');
  const otpToken = searchParams.get('token');
  const otpEmail = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pwStrength = useMemo(() => (password ? passwordStrength(password) : null), [password]);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      setMsg(null);
      try {
        // 1) PKCE flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) throw error;
          setReady(true);
          return;
        }
        // 2) Legacy OTP flow
        if (otpToken && otpEmail) {
          const { error } = await supabase.auth.verifyOtp({
            email: otpEmail,
            token: otpToken,
            type: 'recovery',
          });
          if (cancelled) return;
          if (error) throw error;
          setReady(true);
          return;
        }
        // 3) The Supabase client may have already established a session
        //    (detectSessionInUrl defaults to true).
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionData.session) {
          setReady(true);
          return;
        }
        setMsg('This reset link is invalid or has already been used. Request a new one from the sign-in page.');
      } catch (err) {
        if (cancelled) return;
        setMsg(authErrorMessage(err));
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [code, otpToken, otpEmail]);

  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSuccess(false);
    if (password.length < 8) { setMsg('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setMsg('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMsg(authErrorMessage(error)); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    await supabase.auth.signOut({ scope: 'local' }); // default 'global' would kill sessions on the other Arteve app + all devices
    setTimeout(() => router.push('/login'), 1500);
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface">
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image src="/images/hero.png" alt="Musician performing" fill className="object-cover" priority />
        <div className="relative z-10 flex flex-col justify-end w-full px-10 lg:px-16 py-12 bg-gradient-to-t from-ink-strong/90 via-ink-strong/45 to-transparent">
          <h1 className="text-3xl lg:text-4xl font-display tracking-tight text-white max-w-xl leading-[1.1]">
            Set a new password.
          </h1>
          <p className="mt-4 text-base text-white/85 max-w-xl">
            Pick something only you would know — at least 8 characters with a mix of letters and numbers.
          </p>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-7">
            <Image src="/images/arteve_logo.png" alt="Arteve" width={112} height={28} className="mb-6" />
            <h2 className="text-2xl font-display tracking-tight text-ink-strong">Reset password</h2>
            <p className="mt-1.5 text-sm text-ink-muted">Almost there — choose a new password.</p>
          </div>

          {!ready ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-surface-sunken px-3.5 py-3 text-sm text-ink-muted text-center">
                {msg ? msg : 'Verifying your reset link…'}
              </div>
              <Button variant="outline" fullWidth onClick={() => router.push('/login')}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="New password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                trailingIcon={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-subtle hover:text-ink text-xs">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                }
              />

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

              <Input
                type={showConfirm ? 'text' : 'password'}
                label="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                trailingIcon={
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-ink-subtle hover:text-ink text-xs">
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                }
              />

              {msg && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-xs text-danger">
                  {msg}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 text-xs text-success">
                  Password updated. Redirecting to sign in…
                </div>
              )}

              <Button type="submit" loading={loading} fullWidth size="lg">
                Update password
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Loading() {
  return <p className="p-6 text-sm text-ink-subtle">Verifying reset link…</p>;
}
