# Arteve — Deep User-Journey QA (May 31, 2026)

A second, wider "real user" crawl of both apps covering **everything**: feed, posts,
bits/reels, likes, comments, opening profiles from comments, find + filters + voice,
profiles, follow / followers / following, profile editing and all sub-entity CRUD,
deletes, chat, notifications, account/settings, plus a usability / responsiveness /
accessibility pass. Source-level trace; `path:line` is relative to repo root.
**[verify]** = depends on live Supabase schema/RLS I can't read from the repo.

This supersedes and extends `QA_FINDINGS.md`. Read the corrections first.

---

## 0. Corrections to the first report (things that are actually fine)

While crawling deeper I found that several v1 concerns are already handled — recording
so nobody chases ghosts:

- **Cross-app role gate exists.** Both apps mount `components/RoleGuard.tsx`, which reads
  the profile role and signs out mismatched accounts with a toast pointing to the other
  app. So my v1 "S1.5 no role gate" was overstated. **Remaining real issue (downgraded
  to S2):** the guard is a client-side `useEffect`, so a wrong-role user sees a *flash*
  of the wrong app's UI before the async check signs them out, and enforcement still
  depends on RLS at the API layer. Still worth **[verify]**-ing that
  `gigs/applications/bookings` RLS checks `role`.
- **404 pages exist** (`app/not-found.tsx` in both apps) — AUDIT 3.8 is done.
- **Chat read receipts work** (`chat/[conversationId]/page.tsx:258` renders `read_at`) —
  AUDIT 3.4 is done.
- **Bits tap-to-pause works** (`bits/page.tsx:159 toggleVideoPause`) — AUDIT 3.3 is done.
- **Follower / following counts and list joins are correct** (`profile/[handle]` —
  followers = `following_id = me`, following = `follower_id = me`; the FK-hinted joins
  match). No bug there.
- **Chat send, account delete, and notifications mark-read are well-built** (proper
  error handling, optimistic rollback, tombstone-then-hard-delete). Don't touch.

The S1 booking-pipeline findings from v1 (missing `gig_id` on the booking, title-matched
booking lookup, `'accepted'`/`'rejected'` status drift, broken profile link, dead
"Cancelled" filter, `/placeholder-avatar.png` 404) **all still stand** — see v1.

---

## 1. Notifications — routing gaps and missing triggers (S2)

The notification *system* works, but the wiring between what's **sent** and what's
**routed** is mismatched. Sent types (grepped across both apps): `application_status`,
`booking_status_changed`, `follow`, `new_message`. The router
(`musician/src/app/notifications/page.tsx:123 resolveLink`) handles: `gig_application`,
`application_status`, `gig_closed`, `booking_created`, `new_message`, `follow`, `like`,
`comment`. They barely overlap.

### 1.1 Organizers get **no notification when a musician applies**
`musician/src/app/gigs/[id]/apply/page.tsx` (`submitApplication`)

The apply flow inserts the application but never calls `sendNotification`. `resolveLink`
even has a `gig_application` case ready — nothing ever sends it. An organizer only finds
out by manually opening the gig's applications list.
- **Repro:** Apply to a gig → organizer's bell stays empty.
- **Fix:** `sendNotification({ userId: gig.organizer_id, type: 'gig_application', … })`
  on successful insert.

### 1.2 Booking-status notifications dead-end on the notifications page
All booking accept/decline/cancel/complete handlers send `type:
'booking_status_changed'` (4 call sites), but `resolveLink` has **no case** for it, so it
falls to `default → '/notifications'`. Tapping "Your booking was accepted" just reloads
the notifications list instead of opening the booking.
- **Fix:** add `case 'booking_status_changed': return d.bookingId ?
  \`/bookings/${d.bookingId}\` : '/gigs?tab=bookings';` (note the key is `bookingId`,
  camelCase, in those payloads — another inconsistency vs `booking_id` elsewhere).

### 1.3 Likes and comments never notify anyone
Neither the feed (`page.tsx toggleLike` / `addComment`) nor the bits viewer
(`bits/page.tsx toggleLike` / `sendComment`) calls `sendNotification`. `resolveLink`
handles `like` and `comment`, but they're never produced — dead branches plus a missing
feature. A creator never learns someone engaged with their post.
- **Fix:** notify the post author on like/comment (skip self-actions).

### 1.4 "Application accepted" links to the gig, not the booking
`resolveLink` `application_status → /gigs/${d.gig_id}`. The accept payload also carries
`booking_id`, which would be the more useful destination. Minor.

---

## 2. Feed, posts & comments (S2–S3)

### 2.1 Comment submit fails silently (feed) — S2
`musician/src/app/page.tsx:322 addComment`

```
await supabase.from('post_comments').insert({...});
setNewComment(''); setCommentModalPost(null); await refreshFeed();
```
No error check. If the insert is rejected (RLS, network), the modal still closes, the
text is cleared, and the feed refreshes **without the comment** — the user believes they
commented. Also no `disabled`/in-flight guard, so a fast double-click posts twice.
- **Fix:** check `error`, keep the modal open + toast on failure, disable the button
  while submitting.

### 2.2 Opening a commenter's profile is broken/inconsistent — S2/S3
You asked specifically about "open someone's profile from a comment":

- **Feed comments** link via ``/profile/${c.profiles?.handle ?? ''}`` (`page.tsx:599` &
  `:613`). If that commenter has no handle, the link becomes `/profile/` → wrong page /
  not-found. Latent, since handles are auto-generated, but the `?? ''` fallback is a bug.
- **Bits comments** (`bits/page.tsx:412–419`) render the commenter's avatar + name as
  **plain, non-clickable text** — there's no link at all. So from a Bit you *cannot*
  open a commenter's profile, even though you can from the feed. Inconsistent.
- **Fix:** in bits, wrap the avatar/name in `Link href={handle ? \`/profile/${handle}\`
  : '#'}`; in the feed, guard the empty-handle case the same way.

### 2.3 Bits like/comment have no error handling — S3
`bits/page.tsx:170 toggleLike`, `:208 sendComment` optimistically mutate `rows` /
re-open comments but never check `error`, so a blocked write leaves the UI out of sync
with the DB and no toast. (The *feed* `toggleLike` does this correctly with rollback —
copy that pattern.)

---

## 3. Profiles & following (S3)

### 3.1 Follow-from-modal is a second-class path
`profile/[handle]/page.tsx:192 toggleFollowFromModal`

Following someone from inside the followers/following modal updates `myFollowingIds` but,
unlike the main `toggleFollow`, it (a) sends **no** `follow` notification, and (b)
doesn't update the visible follower count. So who-gets-notified depends on *which button*
you used to follow. Unify the two.

### 3.2 No self-follow guard in the modal
`toggleFollow` is unreachable for yourself (the public profile redirects to `/profile`
when `handle === me`), but `toggleFollowFromModal` has no `targetId === viewerId` check —
if you appear in a mutual list you can follow yourself. **[verify]** there's a DB check
preventing `follower_id = following_id`.

### 3.3 Media lightbox has no keyboard navigation
`profile/[handle]/page.tsx:234 openMedia/nextMedia/prevMedia` — prev/next work via
on-screen buttons but there are no Arrow-key / Esc handlers on the lightbox, and focus
isn't moved into it. Accessibility gap on an otherwise nice gallery.

---

## 4. Profile editing & deletes (S2–S3)

### 4.1 Musician handle save has no collision or format handling — S2
`musician/src/app/profile/edit/page.tsx:225 handleSubmit` upserts `handle` directly. If
the handle is already taken, the unique constraint throws and the raw Postgres message
("duplicate key value violates unique constraint…") is shown to the user. Notably the
**organizer** edit page (`organizer/.../profile/edit/page.tsx:160 saveProfile`) *does*
detect a conflict and auto-suffix a candidate — so the two apps behave differently.
- Additionally, **neither app validates handle format**: spaces, uppercase, slashes, or
  reserved words ("edit", "new") are accepted and silently break the public profile URL
  (`/profile/[handle]` resolves strictly by exact `handle` match).
- **Fix:** port the organizer's collision check to the musician app; validate handle
  against `^[a-z0-9_]{3,30}$` and reject reserved words before saving.

### 4.2 External links saved without validation (both apps) — S2 (security)
Both edit pages store `instagram` / `youtube` / `website` verbatim into `profiles.links`.
There is no URL/scheme validation. The public profile and the musician apply page render
them as `<a href={value}>`; the **musician apply page also omits `rel="noreferrer"`**
(`gigs/[id]/apply/page.tsx` Links section). A stored `javascript:` URL is a stored-XSS
vector, and a value like `@myhandle` becomes a broken relative link.
- **Fix:** validate `http(s)://` on save, normalize bare handles, and add
  `rel="noreferrer nofollow"` everywhere these render.

### 4.3 Avatar storage is inconsistent between apps — S3
- Musician avatar → bucket **`avatars`**, timestamped path, `upsert: false` (good).
- Organizer avatar **and** venue photos → bucket **`media`**, `upsert: true`.
Two different buckets for the same conceptual asset complicates storage policies and
cleanup. Pick one convention. **[verify]** both buckets are public-read or the URLs 404.

### 4.4 Venue photos: no count cap, orphaned on abandon — S3/S4
`organizer/.../profile/edit/page.tsx:127 handleVenuePhotoUpload` uploads each file to
storage immediately, but the `venue_photos` array is only persisted on Save. Upload a few
photos, then leave without saving → files sit in storage unreferenced. No max-count or
size guard. On a per-file upload error it silently `continue`s.

### 4.5 Sub-entity CRUD is solid (note)
Achievements / shows / skills add+edit+delete (`profile/edit`) use `try/catch`, surface
errors, and gate deletes behind `confirm()`. Good — leave as is (the only nit: `confirm()`
is a native blocking dialog; the rest of the app moved to toasts/modals, so these three
are stylistically off).

---

## 5. Find / search & filters (S3)

### 5.1 Search appears to fire on every keystroke (no debounce)
`musician/src/app/find/page.tsx` runs the query effect on `query` changing with no
`setTimeout`/deferred value. Typing "guitarist" fires ~9 PostgREST round-trips. Add a
~250–300 ms debounce.

### 5.2 Gig/venue search builds a raw PostgREST `.or()` filter from user input
`musician/src/lib/find-queries.ts:125` & `:205`
`.or(\`title.ilike.%${query}%,location.ilike.%${query}%\`)` — a query containing `,`
`)` `.` breaks the filter grammar or injects conditions; `%`/`_` act as unescaped
wildcards. (Carried from v1; reconfirmed.) Escape input or use separate `.ilike()` calls.

### 5.3 `.order('date', …)` likely references a non-existent column
`find-queries.ts:206` orders by `date`, while gigs/shows elsewhere use `event_date`. If
the column is `event_date`, this query errors and returns nothing. **[verify column]**

### 5.4 Can't browse with an empty query (by design, but worth a default)
The effect early-returns unless there's a query or an active filter, so the People/Gigs
tabs are blank until you type. Consider showing a default/recent list so the tabs aren't
empty on open.

---

## 6. Chat & account — mostly good, two nits (S4)

- `chat/[conversationId]/page.tsx:176 handleTyping` broadcasts a typing event on **every
  keystroke** with no throttle — chatty on the realtime channel. Throttle to ~1–2 s.
- Account, sign-out, sign-out-everywhere, change-email, change-password, and the
  delete-account flow (tombstone → `delete-account` edge function → global sign-out) are
  well-implemented with validation and toasts. No action needed.

---

## 7. Usability / Responsiveness / Accessibility (cross-cutting)

### 7.1 Raw `<img>` on every user-image hot path — S3
21 files use raw `<img>` (feed cards, profile grids, bits, avatars, booking/application
cards) instead of `next/image`, despite `remotePatterns` being configured. No automatic
AVIF/WebP, no responsive sizing, no lazy-loading — the feed and profile media grids ship
full-size Supabase images. (AUDIT 3.2, still open and now quantified.) Convert the
high-traffic ones (feed, profile grid, public-profile media tab) first.

### 7.2 Inconsistent / weak loading states — S3
Detail pages disagree on loading UX: `organizer/gigs/[id]` and `gigs/[id]/applications`
and `find` show plain `"Loading…"` text, while bookings/applications detail and the gigs
dashboard use polished skeletons. Standardize on the skeleton/spinner-card pattern.
(AUDIT 2.6.)

### 7.3 Avatar fallback is a mix of two filenames, one of which 404s — S1/S3
Pages split between `/placeholder-avatar.png` (does **not** exist in `public/`) and
`/default-avatar.png` (exists). The former renders a broken image. Standardize on
`/default-avatar.png` (or add the missing asset). (Same as v1 1.6; reconfirmed across
the social pages too — e.g. feed/profile/bits all default to `/default-avatar.png`, but
apply/booking/gig-detail use the broken one.)

### 7.4 Design-token violations (raw color scales) — S4
Project rule is brand/accent/semantic tokens, no raw `gray/slate/neutral`. Violations
cluster in: `organizer/gigs/[id]/page.tsx` (`slate-900` gradient, `emerald-100`,
`amber-100`), `applications/[applicationId]/page.tsx` (`emerald-50`, `rose-50`),
`bookings/page.tsx` & `bookings/[bookingId]/page.tsx` (`yellow-100`, `blue-100/700/800`,
`green-600`). Map to `success/warning/brand/danger`.

### 7.5 Image alt text — S4
Many media `<img>` use empty or generic alt (`alt=""`, `alt="avatar"`, `alt="Musician"`).
Decorative is fine empty, but content images (post media in the feed/grid, venue photos)
should carry meaningful alt (caption / name) for screen readers.

### 7.6 Layout-width inconsistency — S4
Pages mix `style={{ maxWidth: 720 }}` (gig create, gigs dashboard, post hub) with
`page page-narrow` and `max-w-5xl` (detail pages). Harmless but visually uneven column
widths between sibling screens. (AUDIT note.)

### 7.7 Native `confirm()` for destructive actions — S4
`profile/edit` deletes use `window.confirm` (blocking, off-brand) while the rest of the
app uses Modals/toasts. Replace with the shared `Modal` for consistency.

### Good a11y already present (keep)
`packages/ui/components/Modal.tsx` has `role="dialog"`, `aria-modal`, Escape-to-close, and
an `aria-label`led close button; bits like/close buttons use `aria-pressed` / `aria-label`;
find's voice & filter buttons use `aria-label` / `aria-expanded`. Solid baseline.

---

## 8. Re-walk of the features you named

| You asked to try… | Result |
|---|---|
| Like a bit / post | Works (optimistic). **No like notification to author** (1.3); bits like has no error rollback (2.3). |
| Comment on a post | Works, but **fails silently on error + can double-post** (2.1); no comment notification (1.3). |
| Open a profile from a comment | **Feed:** works unless commenter has no handle → `/profile/` (2.2). **Bits:** not possible — names aren't links (2.2). |
| Find a person / use filters | Works (people/gigs/venues tabs, location+genre filters, voice). No debounce (5.1); `.or()` injection on gig/venue search (5.2). |
| Edit the profile | Works, but musician handle collisions throw raw DB errors, no handle/link validation (4.1, 4.2). |
| Post things | Works; **no file-size guard despite "50 MB" label** (v1 3.4); no type validation beyond `accept`. |
| Delete things | Sub-entity deletes & account delete are solid (4.5, §6). Gig "Reopen" can silently un-book (v1 3.3). |
| Check others' followers/following | Works — counts and lists are correct. Modal-follow doesn't notify / update counts (3.1); no self-follow guard (3.2). |
| Follow / unfollow | Works with optimistic rollback + notification (main button). |
| Chat | Works well — realtime, read receipts, typing, presence. Only nit: typing broadcast per keystroke (§6). |
| Notifications | List/mark-read solid, but **apply & booking-status notifications mis-route or are never sent** (§1). |

---

## 9. Priority order if you're fixing

1. **v1 S1 booking pipeline** (missing `gig_id`, `accepted`/`rejected` status drift,
   broken profile link, dead Cancelled filter) + **`/placeholder-avatar.png` 404**.
2. **Notify organizers on new applications** (1.1) and **fix booking-status notification
   routing** (1.2) — users currently miss the two most important events.
3. **Silent comment failure** (2.1) and **bits comment authors not linkable** (2.2).
4. **Handle + link validation** on profile edit (4.1, 4.2 — also closes a stored-XSS gap).
5. Polish: debounce search, raw-`<img>`→`next/image`, loading-state + token consistency.

---
*Method: static user-journey trace of every reachable route, handler, and shared
primitive in both apps. **[verify]** items need a check against live Supabase
(`xuhtnwnfyeismbhzbudx`): role enforcement in RLS, unique constraints on `applications`
and `followers`, the `bookings.status`/`applications.status` constraints, storage bucket
visibility, and the `shows`/gig date column name.*
