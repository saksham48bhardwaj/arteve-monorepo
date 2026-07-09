'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Button, Card, Input, Modal, toast } from '@arteve/ui/components';
import { authErrorMessage, passwordStrength } from '@/lib/auth-errors';

export default function AccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState('');
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [emailConfirmedAt, setEmailConfirmedAt] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string>('email');
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Change email
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  // Change password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const pwStrength = useMemo(
    () => (newPassword ? passwordStrength(newPassword) : null),
    [newPassword],
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setCurrentEmail(user.email ?? '');
      setEmailConfirmedAt(user.email_confirmed_at ?? null);
      setLastSignIn(user.last_sign_in_at ?? null);
      setAuthProvider(user.app_metadata?.provider ?? 'email');
      setLoadingProfile(false);
    })();
  }, [router]);

  async function handleChangeEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) {
      toast.error('Enter a different email address.');
      return;
    }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback` },
    );
    setEmailBusy(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success(`Verification sent to ${newEmail}. Click the link to finish the change.`);
    setNewEmail('');
  }

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success('Password updated.');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' }); // default 'global' would kill sessions on the other Arteve app + all devices
    router.push('/login');
  }

  async function handleSignOutEverywhere() {
    await supabase.auth.signOut({ scope: 'global' });
    toast.success('Signed out from all devices.');
    router.push('/login');
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim().toLowerCase() !== 'delete') {
      toast.error('Type "delete" to confirm.');
      return;
    }
    if (!userId) return;
    setDeleting(true);
    try {
      // 1. Tombstone the profile first so it disappears from search/feed even
      //    if the auth deletion partially fails.
      const now = new Date().toISOString();
      await supabase.from('profiles').update({
        display_name: 'Deleted user',
        handle: `deleted_${userId.slice(0, 8)}`,
        bio: null,
        avatar_url: null,
        location: null,
        genres: null,
        links: null,
        quote: null,
        deleted_at: now,
      }).eq('id', userId);

      // 2. Hard-delete the auth.users row via our Edge Function (service role).
      //    If this fails we still log the user out; a follow-up cron can clean up.
      const { error: fnError } = await supabase.functions.invoke('delete-account');
      if (fnError) {
        console.error('delete-account edge function failed', fnError);
        toast.error('Account marked deleted but auth row could not be removed. Contact support if needed.');
      } else {
        toast.success('Your account has been deleted.');
      }

      await supabase.auth.signOut({ scope: 'global' });
      router.push('/login');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loadingProfile) {
    return (
      <main className="page page-narrow">
        <Card>Loading account…</Card>
      </main>
    );
  }

  return (
    <main className="page page-narrow space-y-6">
      <div>
        <h1 className="page-title">Account</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your sign-in details and delete your account.</p>
      </div>

      {/* Identity summary */}
      <Card className="space-y-3">
        <Row label="Email" value={currentEmail} />
        <Row
          label="Email verified"
          value={emailConfirmedAt ? `Yes · ${formatDate(emailConfirmedAt)}` : 'No — check your inbox for the link'}
          valueTone={emailConfirmedAt ? 'default' : 'warning'}
        />
        <Row label="Sign-in method" value={capitalize(authProvider)} />
        {lastSignIn && <Row label="Last sign in" value={formatDate(lastSignIn)} />}
      </Card>

      {/* Change email */}
      {authProvider === 'email' && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink-strong">Change email</h2>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <Input
              type="email"
              label="New email"
              placeholder="new-email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Button type="submit" loading={emailBusy}>Send verification</Button>
            <p className="text-[11px] text-ink-subtle">
              We&apos;ll email a confirmation link to the new address. Your email won&apos;t change until you click it.
            </p>
          </form>
        </section>
      )}

      {/* Change password */}
      {authProvider === 'email' && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink-strong">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              type="password"
              label="New password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
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
              type="password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button type="submit" loading={pwBusy}>Update password</Button>
          </form>
        </section>
      )}

      {/* Session management */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink-strong">Sessions</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
          <Button variant="outline" onClick={handleSignOutEverywhere}>Sign out everywhere</Button>
        </div>
        <p className="text-[11px] text-ink-subtle">
          &quot;Sign out everywhere&quot; ends your session on every device — useful if you suspect your account has been accessed.
        </p>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-danger">Danger zone</h2>
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-ink-strong">Delete this account</p>
          <p className="text-xs text-ink-muted mt-1">
            This wipes your profile from Arteve. Bookings already completed are kept for the other party&apos;s records.
            You won&apos;t be able to sign back in with this email.
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setShowDelete(true)}>
            Delete account
          </Button>
        </div>
      </section>

      {/* Legal links */}
      <div className="text-center text-xs text-ink-subtle pt-2">
        <Link href="/terms" className="hover:text-ink underline underline-offset-2">Terms of use</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-ink underline underline-offset-2">Privacy policy</Link>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={showDelete} onClose={() => { setShowDelete(false); setDeleteConfirm(''); }} title="Delete account?">
        <p className="text-sm text-ink">
          This will remove your profile, posts, and bits from Arteve. This action can&apos;t be undone.
        </p>
        <p className="text-sm text-ink mt-3">
          Type <span className="font-mono text-ink-strong">delete</span> below to confirm.
        </p>
        <Input
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="delete"
          autoFocus
          className="mt-2"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDeleteAccount}>
            Delete forever
          </Button>
        </div>
      </Modal>
    </main>
  );
}

function Row({ label, value, valueTone = 'default' }: {
  label: string;
  value: string;
  valueTone?: 'default' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className={valueTone === 'warning' ? 'text-warning font-medium text-right' : 'text-ink-strong text-right'}>
        {value}
      </span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
