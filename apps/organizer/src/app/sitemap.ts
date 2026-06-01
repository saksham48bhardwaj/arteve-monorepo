import type { MetadataRoute } from 'next';
import { supabase } from '@arteve/supabase/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://organizer.arteve.in';

const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/find', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/login', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === '/' ? '' : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Public organizer profiles (venues).
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('handle, role')
      .not('handle', 'is', null)
      .is('deleted_at', null)
      .eq('role', 'organizer')
      .limit(5000);
    for (const p of profiles ?? []) {
      if (!p.handle) continue;
      entries.push({
        url: `${SITE_URL}/profile/${p.handle}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error('sitemap: profiles fetch failed', err);
  }

  return entries;
}
