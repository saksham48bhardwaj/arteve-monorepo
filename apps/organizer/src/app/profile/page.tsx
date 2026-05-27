'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import {
  Card,
  Button,
  Avatar,
  Badge,
  EmptyState,
  Tabs,
  Modal,
  SafeImage,
  Skeleton,
  Spinner,
  SocialLink,
  toast,
} from '@arteve/ui/components';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  quote: string | null;
  location: string | null;
  links: Record<string, string> | null;
  venue_photos: string[] | null;
  handle: string | null;
};

function abbreviateCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`;
}

export default function OrganizerProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'about'>('photos');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const [followersRes, followingRes, profileRes, myFollowsRes] = await Promise.all([
        supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('followers').select('following_id').eq('follower_id', user.id),
      ]);
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setProfile((profileRes.data ?? null) as Profile | null);
      setMyFollowingIds(myFollowsRes.data?.map((f) => f.following_id) ?? []);

      setLoading(false);
    })();
  }, [router]);

  async function refreshFollowStats() {
    if (!userId) return;
    const [followersRes, followingRes, myFollows] = await Promise.all([
      supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('followers').select('following_id').eq('follower_id', userId),
    ]);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
    setMyFollowingIds(myFollows.data?.map((f) => f.following_id) ?? []);
  }

  async function loadFollowers() {
    if (!userId) return;
    const { data } = await supabase
      .from('followers')
      .select('profiles!followers_follower_id_fkey(*)')
      .eq('following_id', userId);
    setFollowersList((data ?? []).flatMap((r) => r.profiles).filter((p): p is Profile => p !== null));
    setShowFollowModal('followers');
  }

  async function loadFollowing() {
    if (!userId) return;
    const { data } = await supabase
      .from('followers')
      .select('profiles!followers_following_id_fkey(*)')
      .eq('follower_id', userId);
    setFollowingList((data ?? []).flatMap((r) => r.profiles).filter((p): p is Profile => p !== null));
    setShowFollowModal('following');
  }

  async function toggleFollowFromModal(targetId: string) {
    if (!userId || userId === targetId) return;
    const alreadyFollowing = myFollowingIds.includes(targetId);
    if (alreadyFollowing) {
      await supabase.from('followers').delete().eq('follower_id', userId).eq('following_id', targetId);
    } else {
      await supabase.from('followers').insert({ follower_id: userId, following_id: targetId });
    }
    setMyFollowingIds((prev) =>
      alreadyFollowing ? prev.filter((id) => id !== targetId) : [...prev, targetId],
    );
    await refreshFollowStats();
  }

  if (loading) {
    return (
      <main className="page page-narrow">
        <div className="flex items-center gap-4 py-4">
          <Skeleton shape="circle" width={88} height={88} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={14} />
            <div className="flex gap-4 pt-1">
              <Skeleton width={40} height={12} />
              <Skeleton width={40} height={12} />
              <Skeleton width={40} height={12} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Skeleton className="flex-1" height={36} />
          <Skeleton className="flex-1" height={36} />
        </div>
        <div className="flex gap-6 border-b border-line mt-6 pb-2">
          <Skeleton width={48} height={14} />
          <Skeleton width={48} height={14} />
          <Skeleton width={48} height={14} />
        </div>
        <div className="grid grid-cols-3 gap-[2px] mt-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square">
              <Skeleton className="h-full w-full rounded-none" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page page-narrow">
        <Card>
          <p className="text-sm font-medium text-ink-strong">No profile yet</p>
          <p className="mt-1 text-sm text-ink-muted">Get started by editing your venue profile.</p>
          <div className="mt-4">
            <Link href="/profile/edit"><Button>Set up profile</Button></Link>
          </div>
        </Card>
      </main>
    );
  }

  const username = profile.handle ?? profile.id.slice(0, 8);
  const venuePhotos = profile.venue_photos ?? [];
  const links = profile.links ?? {};
  const validLinks = Object.entries(links).filter(([, v]) => !!v);
  const publicProfileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${username}` : '';

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile?.display_name ?? 'Venue on Arteve',
          text: `Check out ${profile?.display_name ?? 'this venue'} on Arteve`,
          url: publicProfileUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicProfileUrl);
        toast.success('Profile link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  }

  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      <div className="px-4 md:px-6 pt-5 pb-8">
        {/* AVATAR + STATS ROW */}
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <img
              src={profile.avatar_url ?? '/default-avatar.png'}
              alt={profile.display_name ?? 'Venue'}
              className="h-24 w-24 rounded-full object-cover ring-1 ring-line"
            />
          </div>

          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-ink-strong leading-tight tabular">{abbreviateCount(venuePhotos.length)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Photos</p>
            </div>
            <button onClick={loadFollowers} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-bold text-ink-strong leading-tight tabular">{abbreviateCount(followersCount)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Followers</p>
            </button>
            <button onClick={loadFollowing} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-bold text-ink-strong leading-tight tabular">{abbreviateCount(followingCount)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Following</p>
            </button>
          </div>
        </div>

        {/* NAME + BIO */}
        <div className="mt-4 space-y-1">
          <h2 className="text-base font-bold text-ink-strong">{profile.display_name ?? 'Unnamed venue'}</h2>
          {profile.location && <p className="text-xs text-ink-muted">{profile.location}</p>}
          {profile.bio && <p className="text-sm text-ink whitespace-pre-line mt-2 leading-relaxed">{profile.bio}</p>}
          <Badge tone="brand" className="mt-2">Organizer · Venue</Badge>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link href="/profile/edit">
            <Button fullWidth size="sm" variant="primary">Edit</Button>
          </Link>
          <Button fullWidth size="sm" variant="outline" onClick={handleShare}>
            Share
          </Button>
          <Link href="/gigs/create">
            <Button fullWidth size="sm" variant="outline">New gig</Button>
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="px-4 md:px-6">
        <Tabs<'photos' | 'about'>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'photos', label: 'Photos' },
            { value: 'about', label: 'About' },
          ]}
          className="!gap-8 justify-center"
        />
      </div>

      {/* PHOTOS */}
      {activeTab === 'photos' && (
        <section className="px-1 md:px-2 mt-1">
          {venuePhotos.length === 0 ? (
            <div className="px-4 md:px-6 mt-4">
              <EmptyState
                title="No venue photos yet"
                description="Add photos of your stage, interior, and crowd vibe."
                action={
                  <Link href="/profile/edit">
                    <Button>Upload photos</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] md:gap-1">
              {venuePhotos.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative w-full pb-[100%] overflow-hidden bg-surface-sunken"
                >
                  <SafeImage
                    src={url}
                    alt="Venue"
                    fill
                    sizes="(max-width: 640px) 33vw, 240px"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABOUT */}
      {activeTab === 'about' && (
        <section className="mt-4 pb-8">
          {/* QUOTE / TAGLINE BANNER */}
          {profile.quote && (
            <div className="relative w-full overflow-hidden h-44 md:h-52">
              {(() => {
                const bgPhoto = venuePhotos[0];
                return bgPhoto ? (
                  <Image src={bgPhoto} alt="" fill sizes="100vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-700),var(--brand-500),var(--accent-500))]" />
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/35" />
              <div className="relative h-full flex items-center justify-center px-6 md:px-10 text-center">
                <p className="text-white text-base md:text-lg font-semibold italic leading-snug max-w-xl drop-shadow">
                  &ldquo;{profile.quote}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* ABOUT */}
          <div className="px-4 md:px-6 mt-6">
            <h3 className="text-base font-bold text-ink-strong mb-3">About</h3>
            {profile.bio ? (
              <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{profile.bio}</p>
            ) : (
              <p className="text-sm text-ink-subtle">No bio added yet.</p>
            )}
          </div>

          {/* LOCATION */}
          {profile.location && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Location</h3>
              <div className="flex items-start gap-2 text-sm text-ink">
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14z" /><circle cx="12" cy="8" r="3" />
                </svg>
                <span>{profile.location}</span>
              </div>
            </div>
          )}

          {/* VENUE HIGHLIGHTS — gallery row */}
          {venuePhotos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3 px-4 md:px-6">Venue gallery</h3>
              <div className="flex gap-3 overflow-x-auto px-4 md:px-6 pb-2 scroll-smooth snap-x snap-mandatory">
                {venuePhotos.map((url, i) => (
                  <a
                    key={`${url}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative shrink-0 w-56 md:w-64 h-40 rounded-2xl overflow-hidden border border-line snap-start bg-surface-sunken"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 360px"
                      className="object-cover transition-transform hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* SOCIAL LINKS */}
          {validLinks.length > 0 && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Social Links</h3>
              <div className="flex flex-wrap items-center gap-3">
                {validLinks.map(([key, value]) => (
                  <SocialLink key={key} name={key} href={value as string} />
                ))}
              </div>
            </div>
          )}

          {!profile.bio && !profile.location && venuePhotos.length === 0 && validLinks.length === 0 && (
            <div className="px-4 md:px-6 mt-4">
              <EmptyState
                title="Profile is still empty"
                description="Add a bio, location, photos, and social links to bring your venue to life."
                action={
                  <Link href="/profile/edit"><Button>Edit profile</Button></Link>
                }
              />
            </div>
          )}
        </section>
      )}

      {/* FOLLOWERS / FOLLOWING MODAL */}
      <Modal
        open={showFollowModal !== null}
        onClose={() => { setShowFollowModal(null); refreshFollowStats(); }}
        title={showFollowModal === 'followers' ? 'Followers' : 'Following'}
      >
        {(() => {
          const list = showFollowModal === 'followers' ? followersList : followingList;
          if (list.length === 0) {
            return <p className="text-sm text-ink-subtle">No one here yet.</p>;
          }
          return (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-sunken">
                  <Link href={`/profile/${p.handle ?? p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={p.avatar_url} alt={p.display_name ?? ''} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-strong truncate">{p.display_name}</p>
                      <p className="text-xs text-ink-subtle truncate">@{p.handle}</p>
                    </div>
                  </Link>
                  {userId !== p.id && (
                    <Button
                      size="sm"
                      variant={myFollowingIds.includes(p.id) ? 'outline' : 'primary'}
                      onClick={() => toggleFollowFromModal(p.id)}
                    >
                      {myFollowingIds.includes(p.id) ? 'Unfollow' : 'Follow'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          );
        })()}
      </Modal>
    </main>
  );
}
