// Next.js instrumentation hook — wires Sentry into the server + edge runtimes.
// The browser side loads sentry.client.config via the SDK automatically.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Forward errors from React Server Components / Server Actions / route
// handlers to Sentry. Required for the App Router.
export const onRequestError = Sentry.captureRequestError;
