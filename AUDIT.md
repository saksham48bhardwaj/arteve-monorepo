# Arteve — Audit (May 27, 2026)

A sweep of `apps/musician`, `apps/organizer`, `packages/*`, and the Supabase
project (`xuhtnwnfyeismbhzbudx`) to surface broken / fragile / duplicated /
half-built things. Items are sorted by severity within each section.

## 1. Severity-1 — fix before launching publicly

### 1.1 Two Supabase views are `SECURITY DEFINER`
- `public.booking_messages` — view bypasses RLS, runs with creator privileges.
- `public.profile_ratings` — same.
- **Impact:** the views can leak data across users regardless of the policies
  on the underlying tables. This is the highest-priority security finding.
- **Fix:** recreate both views with `SECURITY INVOKER` (default in PG 15+):
  `CREATE OR REPLACE VIEW … WITH (security_invoker = true) AS …`

### 1.2 `handle_new_user` trigger has a mutable `search_path`
- **Impact:** if any role's `search_path` is hijacked the trigger could
  resolve to attacker-owned tables and corrupt newly created profile rows.
- **Fix:** `ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;`

### 1.3 Browser `alert()` is used in 11 user-facing flows
Examples: `chat/new/page.tsx`, `profile/page.tsx`, `profile/[handle]/page.tsx`,
`profile/edit/page.tsx`, `bits/page.tsx`. The native alert is jarring on
mobile and blocks the JS thread.

- **Fix:** introduce a shared `<Toast />` primitive in `@arteve/ui` (Sonner /
  Radix Toast pattern) and replace every `alert()`. While at it, replace the
  `confirm()` patterns once those land (none yet, but profile delete flows
  will need them).

### 1.4 Missing FK indexes hurt every join in the app
`conversations` and `post_likes` have **one** index each (the PK). Every
foreign-key column should have a btree index — Supabase's planner won't use
them for the joins our PostgREST queries do otherwise. Confirmed slow at the
PostgREST level on `post_comments` etc. Add at minimum:

```
CREATE INDEX IF NOT EXISTS conversations_booking_id_idx       ON public.conversations(booking_id);
CREATE INDEX IF NOT EXISTS conversations_created_by_idx       ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx             ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx          ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx       ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx          ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx      ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx         ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS applications_gig_id_status_idx     ON public.applications(gig_id, status);
CREATE INDEX IF NOT EXISTS bookings_musician_status_idx       ON public.bookings(musician_id, status);
CREATE INDEX IF NOT EXISTS bookings_organizer_status_idx      ON public.bookings(organizer_id, status);
CREATE INDEX IF NOT EXISTS gigs_organizer_status_idx          ON public.gigs(organizer_id, status);
CREATE INDEX IF NOT EXISTS followers_following_id_idx         ON public.followers(following_id);
```

### 1.5 ~45 silent `console.error` swallows
The catch blocks set local state but never surface a real error to the user.
Once the toast primitive exists, every `console.error(…)` should be paired
with `toast.error('…')` so users see what went wrong instead of a frozen UI.

## 2. Severity-2 — incomplete features / dead routes

### 2.1 Duplicated routes on musician
- `/applications` is a 12-line wrapper around `<ApplicationsList />`
- `/bookings` is an 18-line wrapper around `<BookingsList />`
- Both lists are also rendered inside the unified `/gigs?tab={applications|bookings}` we just shipped.
- **Recommendation:** delete the duplicate routes OR turn them into permanent
  redirects (`/applications → /gigs?tab=applications`, `/bookings → /gigs?tab=bookings`)
  so external links continue to work but the nav stays single-source.

### 2.2 Duplicated profile routes on organizer
- `/artist/[id]` and `/find/[id]` and `/profile/[handle]` all view a profile.
- `/venue/[venueId]` is a fourth one with venue-specific framing.
- **Recommendation:** the rebuilt `/profile/[handle]` covers both musician and
  venue (it branches on `profile.role`). Reduce `/artist/[id]` and
  `/venue/[venueId]` to redirects that look up the handle and forward to
  `/profile/[handle]`.

### 2.3 Musician `/applications/mine` exists but `/applications/page.tsx` does too
Two competing entry points for the same list. Pick one; redirect the other.

### 2.4 Press-kit is half built
`apps/musician/src/app/press-kit/page.tsx` exists but is a barebones content
dump — no PDF export, no shareable public URL, no asset selection. A real
press kit is a known music-industry need (artists send it to bookers).

### 2.5 `/whats-on` (musician) and `/find/[id]` (organizer) — purposes unclear
Both look like leftover exploratory work. Either fold them into Find or
remove them.

### 2.6 No empty/loading state on several detail pages
Spot-checked `/gigs/[id]`, `/applications/[applicationId]`, `/bookings/[bookingId]`
— they have "Loading…" plain text fallbacks at best. Worth replacing with the
spinner-card pattern we use elsewhere.

## 3. Severity-3 — polish / correctness

### 3.1 SocialIcon helper would benefit from sprite mode
Currently every `<SocialLink>` renders a full SVG. With 9 platforms × multiple
profile pages, the bundle has a lot of duplicated path data. Switch to a
single `<defs>` sprite + `<use href="#instagram" />` instances when convenient.

### 3.2 `next/image` not used on user-uploaded images
Hot paths (feed, profile grid, public profile media tab) use raw `<img>`.
For Supabase-hosted images you can use `<Image>` with `remotePatterns`
already set in `next.config.js` to get automatic AVIF/WebP, responsive
sizing, and lazy-loading.

### 3.3 Bits don't have a "tap to play/pause" gesture
The Reels viewer autoplays on intersection, but tapping the screen does
nothing — every other Reels app pauses on tap. Cheap win.

### 3.4 Chat doesn't show read receipts even though we store `read_at`
The data is there. Render a tiny "Seen" or filled checkmark next to your own
last-sent message when `read_at IS NOT NULL`.

### 3.5 Profile completeness widget was removed but the data still exists
Consider re-introducing it on `/profile/edit` only (not the main view), as a
checklist with direct "fix this" links per item.

### 3.6 No image cropping on avatar / venue photo upload
Users can upload 4032×3024 phone photos that get squished. Add a square
cropper (e.g. `react-easy-crop`) before the storage upload.

### 3.7 Notification icons render at slightly different sizes
The badge that overlays the actor avatar (`h-5 w-5`) vs the stand-alone tinted
chip (`h-10 w-10`). Pick one ratio.

### 3.8 No 404 / not-found page
Both apps fall back to Next's default ugly white page. Add `app/not-found.tsx`.

## 4. Severity-4 — small wins

- `apps/musician/src/components/gigs/ApplicationsList.tsx` re-fetches the whole list every time anything in `applications` changes (`postgres_changes` event: '*' with no filter). Filter to just the current user.
- `useMarkNotificationAsRead` hook in `@arteve/shared/notifications/auto-read` is called from chat pages, but only when `notification_id` is in the URL. Once the notifications page links use the `notification_id` query parameter (they now do), this works — but the hook silently no-ops if the URL doesn't include it. Worth surfacing a debug log in dev.
- Several pages still pass `style={{ maxWidth: 720 }}` inline instead of using `page page-narrow`. Tiny consistency win.
- `apps/organizer/src/app/profile/[handle]/page.tsx` imports `Spinner` but doesn't use it directly (only via the loading branch). Tree-shaken at build but worth removing.
- The `bookings` table has both `event_date` (date) and `event_time` (text); consider collapsing to a single `event_at timestamptz` so timezone handling becomes uniform.

## 5. Things that ARE working well (don't touch)

- Token system (warm-stone neutrals + brand-500/accent-300) is clean
- Shared `packages/ui/components/*` primitives are well-typed and consistent
- PostgREST integration is correct after the `post_comments → profiles` FK fix
- Realtime subscriptions on chat are well-cleaned-up (no leak risk seen)
- Vercel deploy + GitHub auto-deploy are wired correctly
- PWA service-worker cache-busting (commit-sha namespaced) is solid
- Login flow + email/password is correct after the INSERT policy fix
- Web Speech API integration on Find has the correct browser-feature fallback

---
*Run `pnpm typecheck && pnpm lint` after any of the above fixes; both apps
currently pass clean.*
