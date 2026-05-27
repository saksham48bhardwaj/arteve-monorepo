import type { AuthError } from '@supabase/supabase-js';

// Map raw Supabase auth errors to user-friendly copy. Falls back to the raw
// message so we never lose information. Lives in @arteve/shared so the
// musician and organizer apps stay consistent.

export function authErrorMessage(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.';
  const e = err as Partial<AuthError> & { message?: string; code?: string };
  const raw = (e.message || '').toLowerCase();
  const code = (e.code || '').toLowerCase();

  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return 'That email and password don’t match. Double-check and try again.';
  }
  if (code === 'email_not_confirmed' || raw.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the verification link.';
  }
  if (code === 'over_email_send_rate_limit' || raw.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (code === 'weak_password' || raw.includes('password should be at least')) {
    return 'Pick a stronger password (at least 8 characters, with letters and numbers).';
  }
  if (code === 'user_already_exists' || raw.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'invalid_email' || raw.includes('unable to validate email')) {
    return 'That email doesn’t look right. Please check the format.';
  }
  if (code === 'same_password' || raw.includes('new password should be different')) {
    return 'Your new password must be different from the current one.';
  }
  if (raw.includes('jwt') || raw.includes('expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  return e.message || 'Something went wrong. Please try again.';
}

// Heuristic password strength check used by signup forms.
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function passwordStrength(pw: string): { score: number; label: PasswordStrength } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  let label: PasswordStrength = 'weak';
  if (score >= 4) label = 'strong';
  else if (score === 3) label = 'good';
  else if (score === 2) label = 'fair';
  return { score, label };
}
