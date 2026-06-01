import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://arteve.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/find', '/bits', '/login', '/terms', '/privacy', '/profile/'],
        disallow: [
          '/account',
          '/chat',
          '/chat/',
          '/notifications',
          '/onboarding',
          '/profile/edit',
          '/post/new',
          '/bits/new',
          '/auth/',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
