import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://organizer.arteve.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/find', '/login', '/terms', '/privacy', '/profile/'],
        disallow: [
          '/account',
          '/chat',
          '/chat/',
          '/notifications',
          '/onboarding',
          '/profile/edit',
          '/gigs/create',
          '/auth/',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
