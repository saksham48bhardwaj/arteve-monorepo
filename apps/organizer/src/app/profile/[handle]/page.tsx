import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PublicProfileClient from './PublicProfileClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://organizer.arteve.in';

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> },
): Promise<Metadata> {
  const { handle } = await params;
  const fallback: Metadata = {
    title: `@${handle}`,
    description: `View ${handle}'s profile on Arteve.`,
    alternates: { canonical: `${SITE_URL}/profile/${handle}` },
  };

  if (!supabaseUrl || !supabaseAnon) return fallback;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data } = await supabase
      .from('profiles')
      .select('display_name, handle, bio, avatar_url, location, genres, role, deleted_at')
      .eq('handle', handle)
      .maybeSingle();

    if (!data || data.deleted_at) return fallback;

    const name = data.display_name || `@${handle}`;
    const role = data.role === 'organizer' ? 'venue' : 'musician';
    const location = data.location ? ` · ${data.location}` : '';
    const genres = (data.genres ?? []).slice(0, 3).join(', ');
    const description =
      data.bio?.trim() ||
      `${name} — ${role}${location}${genres ? ` · ${genres}` : ''}. Connect on Arteve.`;
    const url = `${SITE_URL}/profile/${handle}`;
    const image = data.avatar_url || `${SITE_URL}/images/og-default.png`;

    return {
      title: name,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'profile',
        siteName: 'Arteve Organizer',
        title: `${name} · Arteve`,
        description,
        url,
        images: [{ url: image, alt: name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${name} · Arteve`,
        description,
        images: [image],
      },
    };
  } catch {
    return fallback;
  }
}

export default function Page() {
  return <PublicProfileClient />;
}
