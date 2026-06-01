// Sentry — browser. Loaded by next/sentry on every page.
// DSN is sourced from NEXT_PUBLIC_SENTRY_DSN; if not set, Sentry is a no-op
// (useful for dev + for the period before you create the Sentry project).
import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    // Performance tracing — low rate to stay in the free tier.
    tracesSampleRate: 0.1,
    // Session replays — sample errors at 100%, otherwise off.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    // Don't leak Supabase/PostgREST URLs into breadcrumbs.
    sendDefaultPii: false,
  });
}
