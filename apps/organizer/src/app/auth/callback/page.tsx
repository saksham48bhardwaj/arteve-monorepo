'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { Spinner } from '@arteve/ui/components';
import { authErrorMessage } from '@/lib/auth-errors';

export const dynamic = 'force-dynamic';

// /auth/callback handles the return leg of:
//   1. Google OAuth (?code=...)                      — auto-exchanged
//   2. Magic link / signup / email-change (?token_hash=&type=...) — click-gated
//
// IMPORTANT: `token_hash` OTPs are single-use, and email providers /
// corporate security scanners PREFETCH links (loading this page from their own
// datacenter IPs). If we verified automatically on page load, the scanner would
// burn the token before the human clicked, producing "this link has expired or
// was already used". So we verify token_hash ONLY on an explicit user click —
// scanners load pages but don't click buttons. The PKCE `?code=` path is safe
// to auto-exchange because it needs the code_verifier that only lives in the
// requesting browser, so a prefetch can't consume it.

function generateRandomHandle(prefix = 'venue') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell label="Signing you in…" />}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Signing you in…');
  const [confirmNeeded, setConfirmNeeded] = useState(false);

  const next = params.get('next') || '/profile';

  // Ensure a profile row exists (OAuth users skip our signup form), then route.
  const finishSignIn = useCallback(async () => {
    setStatus('Setting up your account…');
    const { data: { user } } = await supabase.auth.getUser();
    let needsOnboarding = false;
    if (user) {
      const { data: existing } = await supabase
        .from('profiles').select('id, onboarded_at').eq('id', user.id).maybeSingle();
      if (!existing) {
        await supabase.from('profiles').upsert({
          id: user.id,
          role: 'organizer',
          handle: generateRandomHandle('venue'),
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });
        needsOnboarding = true;
      } else if (!existing.onboarded_at) {
        needsOnboarding = true;
      }
    }
    router.replace(needsOnboarding ? '/onboarding' : next);
  }, [router, next]);

  // Called only from the explicit "Continue" button click.
  const verifyTokenHash = useCallback(async () => {
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    if (!tokenHash || !type) return;
    setConfirmNeeded(false);
    setError(null);
    setStatus('Confirming…');
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
      });
      if (error) throw error;
      await finishSignIn();
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [params, finishSignIn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const errorDescription = params.get('error_description');

        if (errorDescription) throw new Error(errorDescription);

        if (code) {
          // OAuth / PKCE — safe to auto-exchange.
          setStatus('Verifying your sign-in…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) throw error;
          await finishSignIn();
        } else if (tokenHash && type) {
          // OTP link — wait for a real click (defeats prefetch/scanners).
          if (cancelled) return;
          setConfirmNeeded(true);
        } else {
          // No auth params — maybe a session already exists (hash-style return).
          const { data } = await supabase.auth.getSession();
          if (cancelled) return;
          if (!data.session) {
            throw new Error('No sign-in info found in the URL. Please try signing in again.');
          }
          await finishSignIn();
        }
      } catch (err) {
        if (cancelled) return;
        setError(authErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [params, finishSignIn]);

  if (error) {
    return (
      <CallbackShell label="Sign-in failed" busy={false}>
        <p className="text-sm text-danger mt-3 text-center max-w-xs">{error}</p>
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink-strong text-white px-4 py-2 text-sm font-medium"
        >
          Back to sign in
        </button>
      </CallbackShell>
    );
  }

  if (confirmNeeded) {
    return (
      <CallbackShell label="Almost there" busy={false}>
        <p className="text-sm text-ink-muted mt-1 text-center max-w-xs">
          Tap below to finish signing in to Arteve.
        </p>
        <button
          type="button"
          onClick={verifyTokenHash}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink-strong text-white px-5 py-2.5 text-sm font-semibold"
        >
          Continue to Arteve
        </button>
      </CallbackShell>
    );
  }

  return <CallbackShell label={status} />;
}

function CallbackShell({ label, busy = true, children }: { label: string; busy?: boolean; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-muted px-6 text-center">
      {busy && <Spinner size={20} />}
      <p className="mt-3 text-sm font-medium text-ink-strong">{label}</p>
      {children}
    </main>
  );
}
