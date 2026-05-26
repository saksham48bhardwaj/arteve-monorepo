'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';
import { Button, Input } from '@arteve/ui/components';

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
  const code = searchParams.get('code');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      setMsg(null);
      if (!code || !email) {
        setMsg('Invalid or expired reset link.');
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (cancelled) return;
      if (error) setMsg(error.message);
      else setReady(true);
    }
    verify();
    return () => { cancelled = true; };
  }, [code, email]);

  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSuccess(false);
    if (password.length < 8) { setMsg('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setMsg('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMsg(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface-muted">
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image src="/images/hero.png" alt="Musician performing" fill className="object-cover" priority />
        <div className="relative z-10 flex flex-col justify-end w-full px-10 lg:px-16 py-12 bg-gradient-to-t from-ink-strong/85 via-ink-strong/55 to-transparent">
          <h1 className="text-3xl lg:text-4xl font-semibold text-white max-w-xl leading-tight">
            Reset your password
          </h1>
          <p className="mt-4 text-base text-white/85 max-w-xl">
            Set a new password to access your Arteve account and get back to booking gigs.
          </p>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10 bg-[linear-gradient(135deg,var(--brand-50)_0%,var(--surface)_50%,var(--accent-50)_100%)]">
        <div className="w-full max-w-md">
          <div className="card-elevated p-7 sm:p-9 rounded-2xl bg-surface/95 backdrop-blur">
            <div className="mb-6 flex flex-col items-center text-center">
              <Image src="/images/arteve_logo.png" alt="Arteve" width={140} height={36} className="mb-4" />
              <p className="text-sm text-ink-muted">Choose a strong password so your account stays secure.</p>
            </div>

            {!ready ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-surface-sunken px-3.5 py-3 text-sm text-ink-muted text-center">
                  Verifying reset link…
                </div>
                {msg && (
                  <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2 text-xs text-danger">
                    {msg}
                  </div>
                )}
                <Button variant="outline" fullWidth onClick={() => router.push('/login')}>
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  trailingIcon={
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-subtle hover:text-ink-muted">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  label="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  trailingIcon={
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-ink-subtle hover:text-ink-muted">
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  }
                />

                {msg && (
                  <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2 text-xs text-danger">
                    {msg}
                  </div>
                )}
                {success && (
                  <div className="rounded-xl border border-success/30 bg-success/5 px-3.5 py-2 text-xs text-success">
                    Password updated. Redirecting to login…
                  </div>
                )}

                <Button type="submit" loading={loading} fullWidth size="lg">
                  Update password
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Loading() {
  return <p className="p-6 text-sm text-ink-subtle">Verifying reset link…</p>;
}
