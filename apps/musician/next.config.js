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
  cacheId: `arteve-musician-${process.env.VERCEL_GIT_COMMIT_SHA || 'dev'}`,
  disable: process.env.NODE_ENV === 'development',

  // Aggressive cache strategy so deploys roll out within one page load
  runtimeCaching: [
    // 1. HTML / page navigations: always try network first so users see new builds
    //    immediately; fall back to cache only when offline.
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'arteve-pages',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // 2. Next.js immutable static chunks (hashed names → safe to cache long).
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'arteve-next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // 3. Next.js image optimizer — revalidate often.
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'arteve-next-image',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // 4. Fonts — long cache.
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'arteve-fonts',
        expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // 5. Supabase API — NEVER cache. Auth, realtime, queries must hit the network.
    {
      urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(?:co|in)\/.*/i,
      handler: 'NetworkOnly',
    },
    // 6. Avatars / public Supabase storage — short SWR.
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
    // Allow next/image to optimize user-uploaded media from Supabase storage.
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
};

module.exports = withPWA(nextConfig);
