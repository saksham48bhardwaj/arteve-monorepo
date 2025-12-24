'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@arteve/supabase/client';

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

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      setMsg(null);

      if (!code || !email) {
        setMsg('Invalid or expired reset link.');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery',
      });

      if (cancelled) return;

      if (error) {
        setMsg(error.message);
      } else {
        setReady(true);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [code, email]);

  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSuccess(false);

    if (password.length < 8) {
      setMsg('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    await supabase.auth.signOut();
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#F5F7FA] text-[#333]">
      {/* Desktop left hero */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5">
        <Image
          src="/images/hero.png"
          alt="Crowd enjoying a live performance"
          fill
          className="object-cover"
          priority
        />
        <div className="relative z-10 flex flex-col justify-between w-full px-10 lg:px-14 py-8 bg-gradient-to-t from-black/75 via-black/50 to-black/30 justify-center">
          <div>
            <h1 className="mt-6 text-3xl lg:text-4xl font-semibold text-white">
              Reset your password
            </h1>
            <p className="mt-4 lg:text-base text-white/80 max-w-xl">
              Secure your organizer account to continue managing artists,
              bookings, and events.
            </p>
          </div>
          <p className="mt-8 text-xs text-white/65">
            Arteve · Connecting artists &amp; venues
          </p>
        </div>
      </section>

      {/* Right side: form */}
      <section className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10 bg-[linear-gradient(120deg,_#4E7FA2,_white,_#FFE3CC)]">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white/95 border border-white/80 shadow-md shadow-black/5 backdrop-blur-sm px-6 py-7 sm:px-8 sm:py-8">
            {/* Header */}
            <div className="mb-4">
              <Image
                src="/images/arteve_logo.png"
                alt="Arteve Organizer"
                width={200}
                height={40}
                className="mx-auto mt-2 mb-8"
              />
              <p className="mt-1.5 text-[#666] text-center">
                Choose a strong password to keep your organizer account secure.
              </p>
            </div>

            {!ready ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 text-center">
                  Verifying reset link…
                </div>

                {msg && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
                    {msg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.75 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-2">
                  <label className="block font-medium text-[#333]">
                    New password
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#4E7FA2] focus:bg-white focus:ring-2 focus:ring-[#4E7FA2]/15"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-[#333]">
                    Confirm new password
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#4E7FA2] focus:bg-white focus:ring-2 focus:ring-[#4E7FA2]/15"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {msg && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
                    {msg}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs text-green-700">
                    Password updated successfully. Redirecting to login…
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-2xl bg-[#4E7FA2] px-4 py-2.75 font-medium text-white shadow-sm transition hover:bg-[#406785] disabled:opacity-70"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-xs text-[#4E7FA2] hover:underline"
                  >
                    Back to login
                  </button>
                </div>

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
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Loading() {
  return (
    <p className="p-4 text-sm text-neutral-500">
      Verifying reset link…
    </p>
  );
}
