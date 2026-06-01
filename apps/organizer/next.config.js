/* eslint-disable @typescript-eslint/no-require-imports */

/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  // Install + activate the new service worker on every page load
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  // Evict old precache contents from previous deploys
  cleanupOutdatedCaches: true,
  // Bust SW cache name on every deploy (Vercel sets VERCEL_GIT_COMMIT_SHA)
  cacheId: `arteve-organizer-${process.env.VERCEL_GIT_COMMIT_SHA || 'dev'}`,
  disable: process.env.NODE_ENV === 'development',

  // Aggressive cache strategy so deploys roll out within one page load
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'arteve-pages',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'arteve-next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'arteve-next-image',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'arteve-fonts',
        expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(?:co|in)\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'arteve-supabase-storage',
        expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow user-uploaded media from Supabase + any external avatar source
    // (Google OAuth = lh*.googleusercontent.com, Gravatar, etc.). Early-app
    // breadth is the right tradeoff here; tighten later if bandwidth is a concern.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

// Wrap with Sentry only when an org + project are configured.
let exported = withPWA(nextConfig);
try {
  const { withSentryConfig } = require('@sentry/nextjs');
  exported = withSentryConfig(exported, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  });
} catch (_) {
  // @sentry/nextjs not installed yet — skip wrapping.
}

module.exports = exported;
