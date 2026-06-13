'use client';

import Link from 'next/link';

type ProfileShape = {
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  genres?: string[] | null;
  links?: Record<string, string | null | undefined> | null;
  quote?: string | null;
};

type RelatedCounts = {
  mediaCount?: number;       // posts + media items
  skillsCount?: number;      // musician-only
  showsCount?: number;       // musician-only
  achievementsCount?: number;// musician-only
};

type Props = {
  profile: ProfileShape;
  related?: RelatedCounts;
  role: 'musician' | 'organizer';
  editHref?: string;
  /** When true, render nothing once the profile is 100% complete (avoids a
   *  persistent banner on an established user's own profile). */
  hideWhenComplete?: boolean;
};

type Item = { label: string; done: boolean; href?: string };

function checklist(profile: ProfileShape, related: RelatedCounts, role: 'musician' | 'organizer'): Item[] {
  const hasAnyLink = profile.links && Object.values(profile.links).some(Boolean);
  const baseItems: Item[] = [
    { label: 'Display name',     done: !!profile.display_name?.trim() },
    { label: 'Handle',           done: !!profile.handle?.trim() },
    { label: 'Avatar',           done: !!profile.avatar_url },
    { label: 'Bio',              done: !!profile.bio?.trim() },
    { label: 'Location',         done: !!profile.location?.trim() },
    { label: 'At least one link',done: !!hasAnyLink },
  ];

  if (role === 'musician') {
    return [
      ...baseItems,
      { label: 'Genres',         done: !!(profile.genres && profile.genres.length > 0) },
      { label: 'Quote',          done: !!profile.quote?.trim() },
      { label: 'A media item',   done: (related.mediaCount ?? 0) > 0 },
      { label: 'At least one skill',     done: (related.skillsCount ?? 0) > 0 },
      { label: 'A past show',    done: (related.showsCount ?? 0) > 0 },
    ];
  }
  // organizer
  return [
    ...baseItems,
    { label: 'Genres / vibe',    done: !!(profile.genres && profile.genres.length > 0) },
    { label: 'Venue photos',     done: (related.mediaCount ?? 0) > 0 },
  ];
}

export function ProfileCompleteness({ profile, related = {}, role, editHref = '/profile/edit', hideWhenComplete = false }: Props) {
  const items = checklist(profile, related, role);
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / total) * 100);

  if (pct === 100) {
    if (hideWhenComplete) return null;
    return (
      <div className="rounded-3xl border border-success/30 bg-success/10 px-5 py-4">
        <p className="text-sm font-medium text-success">
          Your profile is complete. ✨
        </p>
      </div>
    );
  }

  const remaining = items.filter((i) => !i.done);

  return (
    <div className="rounded-3xl border border-line bg-surface px-5 py-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-strong">Complete your profile</p>
          <p className="text-xs text-ink-subtle mt-0.5">
            Profiles with more detail get booked more often.
          </p>
        </div>
        <Link
          href={editHref}
          className="rounded-xl border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-strong hover:bg-surface-sunken"
        >
          Edit profile
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-ink-subtle mb-1">
          <span>{done}/{total} fields filled</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
          <div
            className="h-full rounded-full bg-ink-strong transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {remaining.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {remaining.slice(0, 6).map((item) => (
            <li
              key={item.label}
              className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink"
            >
              {item.label}
            </li>
          ))}
          {remaining.length > 6 && (
            <li className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink-subtle">
              +{remaining.length - 6} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
