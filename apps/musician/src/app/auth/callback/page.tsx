'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { Spinner } from '@arteve/ui/components';
import { authErrorMessage } from '@/lib/auth-errors';

export const dynamic = 'force-dynamic';

// /auth/callback handles the return leg of:
//   1. Google OAuth (?code=...)
//   2. Magic link (?code=...)
//   3. Email confirmation (?code=... or ?token_hash=&type=signup)
// In every case we exchange the code for a session, ensure a profile row
// exists for the user (since OAuth users skip our signup form), and route
// them to either the explicit `?next=` URL or /profile.

function generateRandomHandle(prefix = 'artist') {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const next = params.get('next') || '/profile';
        const errorDescription = params.get('error_description');

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        // PKCE flow (OAuth + magic link)
        if (code) {
          setStatus('Verifying your sign-in…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) throw error;
        }
        // Legacy email-confirmation flow
        else if (tokenHash && type) {
          setStatus('Confirming your email…');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
          });
          if (cancelled) return;
          if (error) throw error;
        }
        // No params at all — maybe the supabase-js client auto-detected the
        // hash-style return.
        else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error('No sign-in info found in the URL. Please try signing in again.');
          }
        }

        if (cancelled) return;
        setStatus('Setting up your account…');

        // Make sure the user has a profile row. OAuth users skip our signup
        // form so they wouldn't have one without this.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existing } = await supabase
            .from('profiles').select('id').eq('id', user.id).maybeSingle();
          if (!existing) {
            await supabase.from('profiles').upsert({
              id: user.id,
              role: 'musician',
              handle: generateRandomHandle('artist'),
              display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            });
          }
        }

        if (cancelled) return;
        router.replace(next);
      } catch (err) {
        if (cancelled) return;
        setError(authErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [params, router]);

  if (error) {
    return (
      <CallbackShell label="Sign-in failed">
        <p className="text-sm text-danger mt-3 text-center">{error}</p>
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

  return <CallbackShell label={status} />;
}

function CallbackShell({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-muted px-6 text-center">
      <Spinner size={20} />
      <p className="mt-3 text-sm text-ink-muted">{label}</p>
      {children}
    </main>
  );
}
