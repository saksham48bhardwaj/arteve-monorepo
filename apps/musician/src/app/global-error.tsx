'use client';

// Catches errors in the root layout (the only ones Next's error.tsx can't see).
// Also pipes them into Sentry — required for Sentry to capture root-level
// rendering crashes.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-surface-muted px-6 text-center">
        <div className="text-[64px] leading-none font-display tracking-tight text-ink-strong">
          Oops
        </div>
        <h1 className="mt-3 text-xl font-semibold text-ink-strong">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-sm">
          We&apos;ve been notified and will look into it. Try refreshing the page.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full bg-ink-strong text-white px-4 py-2 text-sm font-medium"
          >
            Refresh
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
