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
  const [quote, setQuote] = useState(''); // NEW
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

      // Upload to "avatars" bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Public URL
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
        // update
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
        // insert
        const { error } = await supabase.from('achievements').insert({
          profile_id: userId,
          title: achTitle || null,
          description: achDescription || null,
          year: yearValue,
        });

        if (error) throw error;
      }

      // refresh list
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

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit Profile</h1>
          <p className="text-sm text-gray-500">
            Update how organizers and fans see you on Arteve.
          </p>
        </div>
        <a
          href={`/profile/${userId}`}
          className="text-sm text-blue-600 underline"
        >
          View public profile
        </a>
      </header>

      {/* Avatar */}
      <section className="flex items-center gap-4">
        <img
          src={avatarUrl ?? '/placeholder-avatar.png'}
          alt="Avatar"
          className="w-20 h-20 rounded-full object-cover border"
        />
        <label className="cursor-pointer px-3 py-1.5 border rounded-md text-sm hover:bg-gray-100">
          {avatarUploading ? 'Uploading…' : 'Change avatar'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </label>
      </section>

      {/* BASIC PROFILE FORM */}
      <form onSubmit={handleSubmit} className="space-y-4 border-b pb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Display name</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Artist name"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Location</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Artist quote</span>
          <textarea
            className="mt-1 w-full border rounded-md p-2 text-sm"
            rows={2}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder='“Creating melodies that resonate with every heartbeat…”'
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            className="mt-1 w-full border rounded-md p-2 text-sm"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell organizers and fans about yourself…"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Genres (comma-separated)</span>
          <input
            className="mt-1 w-full border rounded-md p-2 text-sm"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="pop, rock, indie"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Instagram</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yourname"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">YouTube</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Website</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md border bg-black text-white text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/profile/${userId}`)}
            className="px-4 py-2 rounded-md border text-sm"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* ACHIEVEMENTS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Achievements</h2>
          <button
            type="button"
            onClick={() => openAchievementModal()}
            className="text-sm px-3 py-1.5 border rounded-md"
          >
            Add Achievement
          </button>
        </div>
        {achievements.length === 0 ? (
          <p className="text-sm text-gray-500">No achievements yet.</p>
        ) : (
          <ul className="space-y-2">
            {achievements.map((a) => (
              <li
                key={a.id}
                className="border rounded-md p-3 bg-gray-50 flex justify-between items-start gap-3"
              >
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  {a.description && (
                    <div className="text-xs text-gray-700">
                      {a.description}
                    </div>
                  )}
                  {a.year && (
                    <div className="text-xs text-gray-500 mt-1">
                      {a.year}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openAchievementModal(a)}
                    className="px-2 py-1 border rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAchievement(a.id)}
                    className="px-2 py-1 border rounded-md text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SHOWS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Shows</h2>
          <button
            type="button"
            onClick={() => openShowModal()}
            className="text-sm px-3 py-1.5 border rounded-md"
          >
            Add Show
          </button>
        </div>
        {shows.length === 0 ? (
          <p className="text-sm text-gray-500">No shows yet.</p>
        ) : (
          <ul className="space-y-2">
            {shows.map((s) => (
              <li
                key={s.id}
                className="border rounded-md p-3 bg-gray-50 flex justify-between items-start gap-3"
              >
                <div className="text-sm">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-gray-700">
                    {[s.venue, s.location].filter(Boolean).join(', ')}
                  </div>
                  {s.event_date && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(s.event_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openShowModal(s)}
                    className="px-2 py-1 border rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteShow(s.id)}
                    className="px-2 py-1 border rounded-md text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SKILLS SECTION */}
      <section className="space-y-3 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Skills</h2>
          <button
            type="button"
            onClick={() => openSkillModal()}
            className="text-sm px-3 py-1.5 border rounded-md"
          >
            Add Skill
          </button>
        </div>
        {skills.length === 0 ? (
          <p className="text-sm text-gray-500">No skills yet.</p>
        ) : (
          <ul className="space-y-2">
            {skills.map((sk) => (
              <li
                key={sk.id}
                className="border rounded-md p-3 bg-gray-50 flex justify-between items-center gap-3"
              >
                <div className="text-sm">
                  <div className="font-medium">{sk.skill}</div>
                  <div className="text-xs text-gray-600">{sk.level}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openSkillModal(sk)}
                    className="px-2 py-1 border rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSkill(sk.id)}
                    className="px-2 py-1 border rounded-md text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Global messages */}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* ACHIEVEMENT MODAL */}
      {achievementModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="absolute inset-0"
            onClick={() => setAchievementModalOpen(false)}
          />
          <form
            onSubmit={saveAchievement}
            className="relative bg-white rounded-lg shadow-lg p-5 w-full max-w-md z-50 space-y-3"
          >
            <h3 className="text-lg font-semibold mb-1">
              {editingAchievement ? 'Edit Achievement' : 'Add Achievement'}
            </h3>
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={achTitle}
                onChange={(e) => setAchTitle(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Description
              <textarea
                className="mt-1 w-full border rounded-md p-2 text-sm"
                rows={3}
                value={achDescription}
                onChange={(e) => setAchDescription(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Year
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={achYear}
                onChange={(e) => setAchYear(e.target.value)}
                placeholder="2024"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAchievementModalOpen(false)}
                className="px-3 py-1.5 border rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-black text-white text-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SHOW MODAL */}
      {showModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="absolute inset-0"
            onClick={() => setShowModalOpen(false)}
          />
          <form
            onSubmit={saveShow}
            className="relative bg-white rounded-lg shadow-lg p-5 w-full max-w-md z-50 space-y-3"
          >
            <h3 className="text-lg font-semibold mb-1">
              {editingShow ? 'Edit Show' : 'Add Show'}
            </h3>
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={showTitle}
                onChange={(e) => setShowTitle(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Venue
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={showVenue}
                onChange={(e) => setShowVenue(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Location
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={showLocation}
                onChange={(e) => setShowLocation(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Event date
              <input
                type="date"
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={showDate}
                onChange={(e) => setShowDate(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModalOpen(false)}
                className="px-3 py-1.5 border rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-black text-white text-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SKILL MODAL */}
      {skillModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="absolute inset-0"
            onClick={() => setSkillModalOpen(false)}
          />
          <form
            onSubmit={saveSkill}
            className="relative bg-white rounded-lg shadow-lg p-5 w-full max-w-md z-50 space-y-3"
          >
            <h3 className="text-lg font-semibold mb-1">
              {editingSkill ? 'Edit Skill' : 'Add Skill'}
            </h3>
            <label className="block text-sm">
              Skill
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Level
              <input
                className="mt-1 w-full border rounded-md p-2 text-sm"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                placeholder="Beginner / Intermediate / Advanced"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSkillModalOpen(false)}
                className="px-3 py-1.5 border rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-black text-white text-sm"
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
