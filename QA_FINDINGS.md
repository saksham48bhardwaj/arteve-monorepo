# Arteve — User-Journey QA Findings (May 31, 2026)

A "real user" crawl of both apps (`apps/organizer`, `apps/musician`) tracing every
reachable flow in source: sign up / sign in, create a gig, edit profile, find & apply
to a gig, accept an application, create & manage bookings, chat, notifications,
posts/bits, and the cross-app loop (organizer posts a gig → musician applies →
organizer books).

This complements the existing `AUDIT.md`. Items here are **behavioral/logic bugs a
user can actually hit**, sorted by severity. File references are `path:line` relative
to repo root. Anything I couldn't confirm without the live DB is marked **[verify]**.

The headline issue: the **gig → application → booking pipeline has a broken data link
and an inconsistent status vocabulary**, and **neither app gates sign-in by role**, so
the two apps' user types can cross over.

---

## S1 — Blockers / correctness (fix before relying on the booking loop)

### 1.1 Accepting an application creates a booking with **no `gig_id`**
`apps/organizer/src/app/applications/[applicationId]/page.tsx` (~L180–205)

The `bookings` insert sets `musician_id`, `organizer_id`, `event_title`, `event_date`,
`location`, `budget_*`, `message`, `status` — but **never sets `gig_id`**, even though
the `Booking` type (`packages/shared/types/booking.ts`) has a `gig_id` field. Every
booking created from an application is orphaned from the gig it came from.

- **User repro:** Organizer posts a gig → musician applies → organizer clicks "Accept &
  create booking". The booking exists but isn't linked to the gig.
- **Direct fallout → 1.2.**
- **Fix:** add `gig_id: gig.id` to the insert payload.

### 1.2 Organizer gig page finds the booking by **matching title text**
`apps/organizer/src/app/gigs/[id]/page.tsx` (~L56–63)

Because of 1.1, this page locates "the booking for this gig" with
`.eq('event_title', g.title)` instead of `.eq('gig_id', id)`. Two gigs with the same
title, or a later title edit, point the "Open booking chat" link at the wrong booking
(or none).

- **User repro:** Create two gigs both titled "Friday Jazz", book one. Both gig pages
  resolve to the same booking.
- **Fix:** once 1.1 lands, query `bookings` by `gig_id`.

### 1.3 Booking is created with `status: 'accepted'`, which isn't a valid `BookingStatus`
`apps/organizer/src/app/applications/[applicationId]/page.tsx` (~L200)

`packages/shared/types/booking.ts` declares `BookingStatus = 'pending' | 'confirmed' |
'cancelled' | 'completed'`. The accept flow writes `'accepted'` (and the direct-book
flow writes `'pending'`). `'confirmed'` is never used anywhere; `'accepted'` is used
everywhere. If the DB column has an enum / CHECK constraint matching the type, **this
insert fails outright** and no booking is created. **[verify DB constraint]**
- **Fix:** reconcile the type and the DB to one vocabulary (recommend `accepted`), and
  drop the unused `confirmed`.

### 1.4 Application reject writes `'rejected'`, but the rest of the app expects `'declined'`
`apps/organizer/src/app/applications/[applicationId]/page.tsx` (decline ~L175; "reject
others" ~L230)

`packages/shared/types/application.ts` defines status `'declined'`, and the
applications list `StatusPill` (`gigs/[id]/applications/page.tsx`) only styles
`pending|accepted|declined`. The accept/decline handlers write `'rejected'`. Result:
rejected applications fall through to the unstyled default and render the raw word
"rejected".
- **User repro:** Decline an application → reopen the gig's applications list → the pill
  shows bare "rejected" text, not the red "Declined" pill.
- **Fix:** write `'declined'` (both the decline handler and the "reject all other
  pending" update).

### 1.5 Neither app gates **sign-in by role** — the two apps cross over
`apps/organizer/src/app/login/page.tsx` (~L175), `apps/musician/src/app/login/page.tsx`
(same shape)

Sign-up tags the user with `data: { role: 'organizer' | 'musician' }`, but **sign-in
just calls `signInWithPassword` and `router.push('/profile')` with no role check**. Both
apps share one Supabase backend and one auth system, so a **musician account can sign
into the organizer app** (and vice versa) and get the full opposite-role UI.

- **User repro:** Sign up in the musician app. Open the organizer app, sign in with the
  same email/password → you land in the organizer dashboard as a musician, with "New
  gig" available.
- **Whether you can actually *create* a gig then depends entirely on `gigs` RLS.** If
  RLS only checks `authenticated` and not `role = 'organizer'`, the role boundary is
  client-side only and is fully bypassed. **[verify gigs/applications/bookings RLS
  enforce role]**
- **Fix:** after sign-in, read the profile role and redirect wrong-role users out (or
  block with a message). Don't rely on the UI alone — enforce role in RLS too.

### 1.6 The "no avatar" fallback image is itself a 404
Referenced in ~8 pages, e.g. `apps/musician/src/app/gigs/[id]/apply/page.tsx`,
`apps/organizer/src/app/applications/[applicationId]/page.tsx`,
`apps/*/src/app/bookings/[bookingId]/page.tsx`, `whats-on/[venue]`, `profile/*`.

Those pages fall back to `src="/placeholder-avatar.png"`, but the file that actually
exists in `public/` is **`default-avatar.png`**. `placeholder-avatar.png` is not
present in either app's `public/`, so every avatar-less user/organizer/musician renders
a broken-image icon.
- **User repro:** View any application, booking, or profile for someone who hasn't set
  an avatar (e.g. a brand-new account) → broken image.
- **Fix:** standardize on one filename. Either add `placeholder-avatar.png` to both
  `public/` dirs or change the fallbacks to `/default-avatar.png` (note the
  applications list and bookings list *already* use `/default-avatar.png`, so the two
  conventions are mixed).

---

## S2 — Feature-breaking but narrower

### 2.1 Booking status vocabulary is fragmented; the "Cancelled" filter is dead
`apps/organizer/src/app/bookings/page.tsx` (filter set ~L197)

Across the app, booking status takes the values `pending`, `accepted`, `declined`,
`completed`, `canceled_by_organizer`, `canceled_by_musician` (American one-L) — plus a
legacy `cancelled` (two-L) that nothing ever writes. The organizer bookings list offers
a filter button **"Cancelled"** whose value is `'cancelled'`. Since real cancellations
are stored as `canceled_by_organizer` / `canceled_by_musician`, **the Cancelled filter
always returns zero rows.**
- **Fix:** filter on the actual values (treat both `canceled_by_*` as "Cancelled"), and
  consolidate the spelling.

### 2.2 Direct "Book Musician" creates bookings that can stall, and stores email as name
`apps/organizer/src/app/book/[musicianId]/page.tsx`

Several issues in one short form:
- `organizer_name: organizerEmail` — the organizer's **name field is set to their
  email** (L~34). The musician's booking detail then shows the email as the name.
- No validation: an empty Event Title / date submits. `event_date` is sent as `''`; a
  `date` column will reject `''` and the insert fails — but the page only handles the
  success branch (`if (!error) router.push(...)`), so on failure **nothing happens and
  no error is shown**. The user clicks "Send" and sees nothing.
- Unauthenticated edge: `setLoading(true)` then `if (!user) return;` leaves the button
  stuck on "Sending…" forever.
- Single Budget input is written to **both** `budget_min` and `budget_max`.
- **Fix:** set `organizer_name` from the profile display name; validate required fields;
  surface insert errors; reset loading on early return.

### 2.3 Musician can apply to the same gig repeatedly, and to closed/booked gigs
`apps/musician/src/app/gigs/[id]/apply/page.tsx`

- **No duplicate-application guard.** `submitApplication` inserts unconditionally; a
  musician can submit N applications to the same gig. **[verify] there's no unique
  constraint on `applications(gig_id, musician_id)`** — if there isn't, the organizer's
  application list fills with dupes.
- **No gig-status check.** The gig detail page hides the Apply button when
  `status !== 'open'`, but `/gigs/[id]/apply` is directly reachable by URL and submits
  regardless — you can apply to a closed or already-booked gig.
- **Fix:** check for an existing application (and add a DB unique constraint); verify
  `gig.status === 'open'` before allowing submit.

### 2.4 "Start chat" can spin forever (organizer) and can create duplicate threads (both)
`apps/organizer/src/app/chat/new/page.tsx`, `apps/musician/src/app/chat/new/page.tsx`

- Organizer version has **no error handling**: `if (!user) return;` / `if (!other)
  return;` and an unchecked `convo.id` after the insert. If the target handle doesn't
  exist or the conversation insert is blocked by RLS, the page sits on "Starting chat…"
  forever (and `convo.id` throws). The musician version added `toast.error` + a
  self-chat guard + a login redirect; the organizer version has **none of these**.
- Organizer version doesn't set `role` on the `conversation_participants` rows; the
  musician version does. If that column is `NOT NULL`, the organizer insert fails.
  **[verify]**
- Both: the "find existing conversation" lookup isn't atomic, so a double-click or two
  tabs create duplicate 1:1 conversations (no unique constraint on the participant
  pair). **[verify]**
- **Fix:** port the musician version's guards into the organizer version; consider an
  RPC / unique index to make "get-or-create conversation" atomic.

### 2.5 Organizer booking detail "View full profile" link is broken
`apps/organizer/src/app/bookings/[bookingId]/page.tsx` (musician select ~L78, link in
the snapshot card)

The musician profile is selected as `id, display_name, avatar_url, genres, location` —
**`handle` is not selected** — but the link is
`/profile/${musician?.handle ?? musician?.id}`. So `handle` is always `undefined` and
the link falls back to `/profile/<uuid>`. `profile/[handle]` resolves strictly by
`.eq('handle', handle)` (confirmed in `profile/[handle]/page.tsx` L106), so the UUID
never matches → "Profile not found".
- **Fix:** add `handle` to the select.

---

## S3 — Polish / robustness

### 3.1 Gig budget validation lets through `0`, negatives, and inverted ranges
`apps/organizer/src/app/gigs/create/page.tsx` (L53–59)

`if (minN && maxN && minN > maxN)` uses truthiness, so a max of `0` (falsy) skips the
check and you can save min 500 / max 0. `type="number" min={0}` is not enforced on
typed/pasted input, so `-50` passes `Number()` and is stored. No upper sanity bound.
- **Fix:** compare with explicit `!= null`, clamp to `>= 0`, and validate `min <= max`.

### 3.2 No past-date guard on gigs or bookings
`gigs/create/page.tsx`, `book/[musicianId]/page.tsx`

`event_date` accepts any date; you can publish a gig or send a booking for a date in the
past. Add `min={today}` and/or a submit-time check.

### 3.3 "Reopen gig" silently un-books a booked gig
`apps/organizer/src/app/gigs/[id]/page.tsx` (`reopenGig`, button ~L226)

The Reopen button renders for **any** status that isn't `open`, including `booked`.
Clicking it sets the gig back to `open` while the booking still exists, with no
confirmation — leaving a booked gig open for new applications.
- **Fix:** only offer Reopen for `closed`, or confirm + handle the existing booking.

### 3.4 Uploads have no size/type guard despite the "up to 50 MB" label
`apps/musician/src/app/post/new/page.tsx`, `apps/musician/src/app/bits/new/page.tsx`

The UI says "up to 50 MB" but there is **no file-size check** in code (only a caption
length cap). The only type signal is the `accept` attribute (a client hint, bypassable)
plus `file.type.startsWith(...)`; an empty/odd MIME falls through to `'image'`. Large or
mistyped files upload straight to storage.
- **Fix:** validate `file.size` and MIME before `.upload()`, with a friendly error.

### 3.5 Profile/external links aren't scheme-validated or `rel`-protected (musician side)
`apps/musician/src/app/gigs/[id]/apply/page.tsx` (Links section)

User-controlled profile links are rendered as `<a href={value} target="_blank">` with
**no `rel="noreferrer"`** and no URL-scheme check, so a stored `javascript:` URL is a
stored-XSS vector and outbound links leak the referrer / `window.opener`. The organizer
application-detail page *does* add `rel="noreferrer"` — make it consistent.
- **Fix:** add `rel="noreferrer nofollow"`; validate links are `http(s)` on save.

### 3.6 Search `.or()` filters interpolate raw user text (PostgREST filter injection)
`apps/musician/src/lib/find-queries.ts` (L125, L205)

`.or(\`title.ilike.%${query}%,location.ilike.%${query}%\`)` builds a PostgREST filter
string from raw input. A query containing `,` `)` or `.` can break the filter or inject
additional conditions, and unescaped `%`/`_` act as wildcards. At minimum this throws on
odd input; at worst it alters the query.
- **Fix:** sanitize/escape the query, or split into separate `.ilike()` calls instead of
  a hand-built `.or()` string.

### 3.7 `.order('date', …)` on the shows/whats-on query references a likely-wrong column
`apps/musician/src/lib/find-queries.ts` (L206)

This query orders by a column `date`, while gig/show rows elsewhere use `event_date`. If
the column is actually `event_date`, the order clause errors and the query returns
nothing. **[verify column name]**

### 3.8 Notification bodies print raw enum values
e.g. `apps/musician/src/app/bookings/[bookingId]/page.tsx` (`updateStatus`)

`body: \`…is now ${status}.\`` surfaces strings like "is now canceled_by_musician" to the
recipient. Map statuses to human labels before sending.

---

## S4 — Consistency / smaller wins

- **Design-system token violations** (per the project's "no raw `gray/slate/neutral`,
  use brand/accent tokens" rule): raw `slate-900` gradient and `emerald-100 / amber-100
  / rose-50` in `gigs/[id]/page.tsx` and `applications/[applicationId]/page.tsx`;
  `yellow-100 / blue-100 / blue-800 / green-600 / blue-700` in the bookings list/detail.
  Replace with `success/warning/brand/danger` tokens.
- **Mixed avatar fallback filenames** (`/placeholder-avatar.png` vs `/default-avatar.png`)
  — see 1.6; pick one.
- **"Accept & create booking" auto-confirms without the musician's consent.** The
  application-accept path sets the booking straight to `accepted`; the musician only
  gets a "Cancel" option, never an "Accept". The direct-book path *does* ask the
  musician to Accept/Decline. Decide whether application-accept should also require
  musician confirmation, for consistency.
- **Onboarding is only enforced on the sign-up path.** Sign-in always routes to
  `/profile`, so a user who abandoned onboarding (no `onboarded_at`) is never prompted
  again.
- **Concurrency on application-accept:** "reject all other pending" is sequential, so two
  tabs/clicks can create two bookings for one gig. Low-likelihood; consider a guard or a
  transactional RPC.

---

## Worked example — the cross-app loop you described

1. **Organizer app:** sign up → onboarding → **Post a gig** ("Friday Jazz", budget,
   date). Works. (Caveats: 3.1 budget, 3.2 past date.)
2. **Musician app:** Find → open the gig → **Apply** with a message. Works, but you can
   apply again and again (2.3) and even apply if the gig is closed via direct URL.
3. **Organizer app:** open the application → **Accept & create booking**. The booking is
   created **without `gig_id`** (1.1), with status **`accepted`** that's outside the
   declared type (1.3, may even fail at the DB), and the other applicants are marked
   **`rejected`** instead of `declined` (1.4).
4. **Either app:** open the booking → chat, mark completed, cancel. These work, but the
   organizer's "View full profile" link is broken (2.5), the "Cancelled" filter shows
   nothing (2.1), and any avatar-less party shows a broken image (1.6).

Note there is **no "musician books the gig" action** — by design musicians *apply* and
organizers *book*. The closest equivalents (organizer's direct `/book/[musicianId]`,
musician accepting a booking) are covered above.

---
*Method: static user-journey trace of every reachable route in both apps. Items marked
**[verify]** depend on live Supabase schema/RLS I couldn't read from the repo — worth a
quick check against project `xuhtnwnfyeismbhzbudx` (unique constraints on `applications`
and `conversation_participants`, the `bookings.status` and `applications.status`
constraints, and whether `gigs/applications/bookings` RLS enforces `role`).*
