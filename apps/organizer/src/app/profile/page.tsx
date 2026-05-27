'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Spinner,
} from '@arteve/ui/components';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
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
        <Card className="flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-sm text-ink-muted">Loading your venue profile…</span>
        </Card>
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
        alert('Profile link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  }

  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      {/* Sticky username header */}
      <header className="sticky top-14 md:top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-line bg-surface/90 backdrop-blur">
        <div className="w-8" />
        <h1 className="text-base font-semibold text-ink-strong truncate">@{username}</h1>
        <Link href="/profile/edit" aria-label="Edit profile" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </Link>
      </header>

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
              <p className="text-lg font-semibold text-ink-strong leading-tight">{abbreviateCount(venuePhotos.length)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Photos</p>
            </div>
            <button onClick={loadFollowers} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-semibold text-ink-strong leading-tight">{abbreviateCount(followersCount)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Followers</p>
            </button>
            <button onClick={loadFollowing} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-semibold text-ink-strong leading-tight">{abbreviateCount(followingCount)}</p>
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
                  <img src={url} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" alt="Venue" />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABOUT */}
      {activeTab === 'about' && (
        <section className="px-4 md:px-6 mt-4 space-y-4 pb-8">
          <Card>
            {profile.bio ? (
              <>
                <h2 className="section-title mb-2">About</h2>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </>
            ) : (
              <EmptyState title="No bio yet" description="Tell artists about your venue in the editor." />
            )}

            {validLinks.length > 0 && (
              <div className="mt-5 pt-5 border-t border-line">
                <h3 className="text-sm font-semibold text-ink-strong mb-2">Links</h3>
                <div className="flex flex-wrap gap-2">
                  {validLinks.map(([key, value]) => (
                    <a
                      key={key}
                      href={value as string}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition"
                    >
                      {key}
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17 17 7" /><path d="M7 7h10v10" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
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
