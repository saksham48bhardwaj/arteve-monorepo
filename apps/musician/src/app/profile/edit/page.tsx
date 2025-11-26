'use client';

import {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  quote: string | null;
};

type Achievement = {
  id: string;
  title: string | null;
  description: string | null;
  year: number | null;
};

type Show = {
  id: string;
  title: string | null;
  venue: string | null;
  location: string | null;
  event_date: string | null; // ISO date string
};

type Skill = {
  id: string;
  skill: string | null;
  level: string | null;
};

export default function EditProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  // profile form fields
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [quote, setQuote] = useState('');
  const [location, setLocation] = useState('');
  const [genres, setGenres] = useState(''); // comma separated

  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [website, setWebsite] = useState('');

  // portfolio lists
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Achievement modal state
  const [achievementModalOpen, setAchievementModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] =
    useState<Achievement | null>(null);
  const [achTitle, setAchTitle] = useState('');
  const [achDescription, setAchDescription] = useState('');
  const [achYear, setAchYear] = useState('');

  // Show modal state
  const [showModalOpen, setShowModalOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [showTitle, setShowTitle] = useState('');
  const [showVenue, setShowVenue] = useState('');
  const [showLocation, setShowLocation] = useState('');
  const [showDate, setShowDate] = useState(''); // yyyy-mm-dd

  // Skill modal state
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setSuccess(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      // PROFILE
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const p = data as Profile | null;
      if (p) {
        setDisplayName(p.display_name ?? '');
        setAvatarUrl(p.avatar_url ?? null);
        setBio(p.bio ?? '');
        setQuote(p.quote ?? '');
        setLocation(p.location ?? '');
        setGenres((p.genres ?? []).join(', '));

        const links = p.links ?? {};
        setInstagram(links.instagram ?? '');
        setYoutube(links.youtube ?? '');
        setWebsite(links.website ?? '');
      }

      // ACHIEVEMENTS
      const { data: a } = await supabase
        .from('achievements')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      setAchievements((a as Achievement[]) ?? []);

      // SHOWS
      const { data: s } = await supabase
        .from('shows')
        .select('*')
        .eq('profile_id', user.id)
        .order('event_date', { ascending: false });
      setShows((s as Show[]) ?? []);

      // SKILLS
      const { data: sk } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      setSkills((sk as Skill[]) ?? []);

      setLoading(false);
    })();
  }, [router]);

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!userId) {
        alert('User not loaded yet');
        return;
      }

      setAvatarUploading(true);
      setErr(null);
      setSuccess(null);

      const ext = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${ext}`;
      const filePath = `profiles/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSuccess('Avatar updated successfully.');
    } catch (error) {
      console.error('AVATAR UPLOAD ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setErr(null);
    setSuccess(null);

    try {
      const genresArr = genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      const links: Record<string, string> = {};
      if (instagram) links.instagram = instagram;
      if (youtube) links.youtube = youtube;
      if (website) links.website = website;

      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          display_name: displayName || null,
          avatar_url: avatarUrl ?? null,
          bio: bio || null,
          quote: quote || null,
          location: location || null,
          genres: genresArr.length ? genresArr : null,
          links,
        },
        { onConflict: 'id' }
      );

      if (error) throw error;

      setSuccess('Profile saved successfully.');
    } catch (error) {
      console.error('SAVE PROFILE ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  // ---------- Achievements CRUD ----------

  function openAchievementModal(a?: Achievement) {
    if (a) {
      setEditingAchievement(a);
      setAchTitle(a.title ?? '');
      setAchDescription(a.description ?? '');
      setAchYear(a.year ? String(a.year) : '');
    } else {
      setEditingAchievement(null);
      setAchTitle('');
      setAchDescription('');
      setAchYear('');
    }
    setAchievementModalOpen(true);
    setErr(null);
    setSuccess(null);
  }

  async function saveAchievement(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setErr(null);
      setSuccess(null);

      const yearValue =
        achYear.trim() === '' ? null : Number(achYear.trim()) || null;

      if (editingAchievement) {
        const { error } = await supabase
          .from('achievements')
          .update({
            title: achTitle || null,
            description: achDescription || null,
            year: yearValue,
          })
          .eq('id', editingAchievement.id)
          .eq('profile_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('achievements').insert({
          profile_id: userId,
          title: achTitle || null,
          description: achDescription || null,
          year: yearValue,
        });

        if (error) throw error;
      }

      const { data: a } = await supabase
        .from('achievements')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      setAchievements((a as Achievement[]) ?? []);
      setAchievementModalOpen(false);
      setSuccess('Achievement saved.');
    } catch (error) {
      console.error('SAVE ACHIEVEMENT ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to save achievement');
    }
  }

  async function deleteAchievement(id: string) {
    if (!userId) return;
    if (!confirm('Delete this achievement?')) return;

    try {
      setErr(null);
      setSuccess(null);

      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', id)
        .eq('profile_id', userId);

      if (error) throw error;

      setAchievements((prev) => prev.filter((a) => a.id !== id));
      setSuccess('Achievement deleted.');
    } catch (error) {
      console.error('DELETE ACHIEVEMENT ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to delete achievement');
    }
  }

  // ---------- Shows CRUD ----------

  function openShowModal(show?: Show) {
    if (show) {
      setEditingShow(show);
      setShowTitle(show.title ?? '');
      setShowVenue(show.venue ?? '');
      setShowLocation(show.location ?? '');
      setShowDate(show.event_date ? show.event_date.slice(0, 10) : '');
    } else {
      setEditingShow(null);
      setShowTitle('');
      setShowVenue('');
      setShowLocation('');
      setShowDate('');
    }
    setShowModalOpen(true);
    setErr(null);
    setSuccess(null);
  }

  async function saveShow(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setErr(null);
      setSuccess(null);

      const eventDateValue = showDate || null;

      if (editingShow) {
        const { error } = await supabase
          .from('shows')
          .update({
            title: showTitle || null,
            venue: showVenue || null,
            location: showLocation || null,
            event_date: eventDateValue,
          })
          .eq('id', editingShow.id)
          .eq('profile_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('shows').insert({
          profile_id: userId,
          title: showTitle || null,
          venue: showVenue || null,
          location: showLocation || null,
          event_date: eventDateValue,
        });

        if (error) throw error;
      }

      const { data: s } = await supabase
        .from('shows')
        .select('*')
        .eq('profile_id', userId)
        .order('event_date', { ascending: false });

      setShows((s as Show[]) ?? []);
      setShowModalOpen(false);
      setSuccess('Show saved.');
    } catch (error) {
      console.error('SAVE SHOW ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to save show');
    }
  }

  async function deleteShow(id: string) {
    if (!userId) return;
    if (!confirm('Delete this show?')) return;

    try {
      setErr(null);
      setSuccess(null);

      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', id)
        .eq('profile_id', userId);

      if (error) throw error;

      setShows((prev) => prev.filter((s) => s.id !== id));
      setSuccess('Show deleted.');
    } catch (error) {
      console.error('DELETE SHOW ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to delete show');
    }
  }

  // ---------- Skills CRUD ----------

  function openSkillModal(skill?: Skill) {
    if (skill) {
      setEditingSkill(skill);
      setSkillName(skill.skill ?? '');
      setSkillLevel(skill.level ?? '');
    } else {
      setEditingSkill(null);
      setSkillName('');
      setSkillLevel('');
    }
    setSkillModalOpen(true);
    setErr(null);
    setSuccess(null);
  }

  async function saveSkill(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setErr(null);
      setSuccess(null);

      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update({
            skill: skillName || null,
            level: skillLevel || null,
          })
          .eq('id', editingSkill.id)
          .eq('profile_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('skills').insert({
          profile_id: userId,
          skill: skillName || null,
          level: skillLevel || null,
        });

        if (error) throw error;
      }

      const { data: sk } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      setSkills((sk as Skill[]) ?? []);
      setSkillModalOpen(false);
      setSuccess('Skill saved.');
    } catch (error) {
      console.error('SAVE SKILL ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to save skill');
    }
  }

  async function deleteSkill(id: string) {
    if (!userId) return;
    if (!confirm('Delete this skill?')) return;

    try {
      setErr(null);
      setSuccess(null);

      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id)
        .eq('profile_id', userId);

      if (error) throw error;

      setSkills((prev) => prev.filter((sk) => sk.id !== id));
      setSuccess('Skill deleted.');
    } catch (error) {
      console.error('DELETE SKILL ERROR:', error);
      if (error instanceof Error) setErr(error.message);
      else setErr('Failed to delete skill');
    }
  }

  // ---------- RENDER ----------

  if (loading) return <main className="p-6">Loading profile…</main>;
  if (!userId) return <main className="p-6">No user session.</main>;

  const username =
    displayName.trim().length > 0
      ? displayName.toLowerCase().replace(/\s+/g, '')
      : userId.slice(0, 8);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-white">
      {/* Header / Breadcrumb */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
            Profile
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Edit artist profile
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Update how organizers and fans see you on Arteve.
          </p>
        </div>

        <a
          href={`/profile/${userId}`}
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-50"
        >
          View public profile →
        </a>
      </header>

      {/* MAIN PROFILE CARD + BASIC FIELDS */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-6 md:px-8 md:py-8 space-y-6"
      >
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Avatar + button */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <img
              src={avatarUrl ?? '/placeholder-avatar.png'}
              alt="Avatar"
              className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border border-gray-200 shadow-sm"
            />
            <label className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-full text-xs md:text-sm text-gray-700 hover:bg-gray-50">
              {avatarUploading ? 'Uploading…' : 'Change avatar'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
          </div>

          {/* Main fields */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-[0.16em]">
                Artist name
              </label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Artist name"
              />
              <p className="text-xs text-gray-500">
                @{username}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-[0.16em]">
                  Location
                </label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-[0.16em]">
                  Genres
                </label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  placeholder="pop, rock, indie"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Comma-separated list; this powers your tags.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-[0.16em]">
                Artist quote
              </label>
              <textarea
                className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-black/80"
                rows={2}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder='“Creating melodies that resonate with every heartbeat…”'
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-[0.16em]">
                Bio
              </label>
              <textarea
                className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-black/80"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell organizers and fans about yourself…"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <label className="block text-xs font-medium text-gray-700">
                Instagram
                <input
                  className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/yourname"
                />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                YouTube
                <input
                  className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Website
                <input
                  className="mt-1 w-full border border-gray-200 rounded-2xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-4">
          <div className="flex gap-2 text-xs">
            {err && <span className="text-red-600">{err}</span>}
            {success && <span className="text-green-600">{success}</span>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/profile/${userId}`)}
              className="px-4 py-2 rounded-full border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-full bg-black text-white text-xs md:text-sm disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </form>

      {/* GRID: Achievements / Shows / Skills */}
      <section className="grid md:grid-cols-2 gap-6 pb-10">
        {/* LEFT COLUMN: Achievements + Shows */}
        <div className="space-y-6">
          {/* Achievements */}
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Achievements
                </h2>
                <p className="text-xs text-gray-500">
                  Awards, milestones, and key highlights.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAchievementModal()}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {achievements.length === 0 ? (
              <p className="text-sm text-gray-500">
                No achievements yet. Add your first one.
              </p>
            ) : (
              <ul className="space-y-2">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className="border border-gray-100 rounded-2xl px-3 py-3 bg-gray-50 flex justify-between items-start gap-3"
                  >
                    <div>
                      <div className="font-medium text-sm">{a.title}</div>
                      {a.description && (
                        <div className="text-xs text-gray-700">
                          {a.description}
                        </div>
                      )}
                      {a.year && (
                        <div className="text-[11px] text-gray-500 mt-1">
                          {a.year}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => openAchievementModal(a)}
                        className="px-2 py-1 border border-gray-300 rounded-full hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAchievement(a.id)}
                        className="px-2 py-1 border border-red-200 text-red-600 rounded-full hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Shows */}
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Recent shows
                </h2>
                <p className="text-xs text-gray-500">
                  Capture your most relevant performances.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openShowModal()}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {shows.length === 0 ? (
              <p className="text-sm text-gray-500">No shows yet.</p>
            ) : (
              <ul className="space-y-2">
                {shows.map((s) => (
                  <li
                    key={s.id}
                    className="border border-gray-100 rounded-2xl px-3 py-3 bg-gray-50 flex justify-between items-start gap-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-gray-700">
                        {[s.venue, s.location].filter(Boolean).join(', ')}
                      </div>
                      {s.event_date && (
                        <div className="text-[11px] text-gray-500 mt-1">
                          {new Date(s.event_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => openShowModal(s)}
                        className="px-2 py-1 border border-gray-300 rounded-full hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteShow(s.id)}
                        className="px-2 py-1 border border-red-200 text-red-600 rounded-full hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Skills */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Skills
                </h2>
                <p className="text-xs text-gray-500">
                  Highlight your strongest skills and levels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openSkillModal()}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {skills.length === 0 ? (
              <p className="text-sm text-gray-500">No skills yet.</p>
            ) : (
              <ul className="space-y-2">
                {skills.map((sk) => (
                  <li
                    key={sk.id}
                    className="border border-gray-100 rounded-2xl px-3 py-3 bg-gray-50 flex justify-between items-center gap-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{sk.skill}</div>
                      <div className="text-xs text-gray-600">{sk.level}</div>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => openSkillModal(sk)}
                        className="px-2 py-1 border border-gray-300 rounded-full hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSkill(sk.id)}
                        className="px-2 py-1 border border-red-200 text-red-600 rounded-full hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

      {/* ACHIEVEMENT MODAL */}
      {achievementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="absolute inset-0"
            onClick={() => setAchievementModalOpen(false)}
          />
          <form
            onSubmit={saveAchievement}
            className="relative z-50 w-full max-w-md rounded-2xl bg-white px-5 py-5 shadow-xl space-y-3"
          >
            <h3 className="text-lg font-semibold mb-1">
              {editingAchievement ? 'Edit achievement' : 'Add achievement'}
            </h3>
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={achTitle}
                onChange={(e) => setAchTitle(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Description
              <textarea
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                rows={3}
                value={achDescription}
                onChange={(e) => setAchDescription(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Year
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={achYear}
                onChange={(e) => setAchYear(e.target.value)}
                placeholder="2024"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAchievementModalOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-full text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-full bg-black text-white text-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SHOW MODAL */}
      {showModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="absolute inset-0"
            onClick={() => setShowModalOpen(false)}
          />
          <form
            onSubmit={saveShow}
            className="relative z-50 w-full max-w-md rounded-2xl bg-white px-5 py-5 shadow-xl space-y-3"
          >
            <h3 className="text-lg font-semibold mb-1">
              {editingShow ? 'Edit show' : 'Add show'}
            </h3>
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={showTitle}
                onChange={(e) => setShowTitle(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Venue
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={showVenue}
                onChange={(e) => setShowVenue(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Location
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={showLocation}
                onChange={(e) => setShowLocation(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Event date
              <input
                type="date"
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={showDate}
                onChange={(e) => setShowDate(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModalOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-full text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-full bg-black text-white text-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SKILL MODAL */}
      {skillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="absolute inset-0"
            onClick={() => setSkillModalOpen(false)}
          />
          <form
            onSubmit={saveSkill}
            className="relative z-50 w-full max-w-md rounded-2xl bg-white px-5 py-5 shadow-xl space-y-3"
          >
            <h3 className="text-lg font-semibold mb-1">
              {editingSkill ? 'Edit skill' : 'Add skill'}
            </h3>
            <label className="block text-sm">
              Skill
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Level
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/80"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                placeholder="Beginner / Intermediate / Advanced"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSkillModalOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-full text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-full bg-black text-white text-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
