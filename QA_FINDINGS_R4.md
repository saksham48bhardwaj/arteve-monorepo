# Arteve — QA Round 4: Fix Verification + Deeper Edge Cases (May 31, 2026)

This round (a) verifies the fixes you shipped since round 3 (commits `qa1`–`qa5` and the
`fix(ui)` commit), checking each for correctness and regressions, and (b) goes deeper on
user journeys and edge cases — both in code and **live in the production musician app**
(logged in as `lokeshpatwa021996@gmail.com`). The organizer app is still hard-blocked for
my browser tool, so it's code-only.

Legend: ✅ verified fixed · ⚠️ fixed but incomplete/new issue · ❌ still open · 🆕 new
finding this round · **[verify]** needs live DB/RLS.

---

## A. Fix verification

### ✅ Confirmed fixed (and correct)

- **Comment modal centering (round-3 UI-1)** — *live verified.* Clicking "Comment" /
  "View all comments" now shows a properly **centered modal with a dim backdrop**,
  immediately. Root cause was real and well-fixed: the `.page-in` transition wrapper has
  `transform`, which broke `position:fixed`; `Modal` now `createPortal`s to `document.body`,
  and the feed's two inline dialogs were rebuilt on top of the shared `Modal`.
- **`/find` no longer hangs (round-3 UI-3)** — *live verified.* The page loads fully
  (recent + suggestions) instead of spinning forever.
- **Search `.or()` injection + debounce (qa5)** — *live verified.* Typing `guitar,)(%_`
  returns "No results" gracefully (no crash); `jazz` on the Gigs tab returns the real gig.
  `sanitizeForOr()` strips `,()*%_\` correctly.
- **Nav active-state on others' profiles (round-3 UI-6)** — *live verified.* Viewing
  `/profile/naya` highlights **no** sidebar item (was wrongly highlighting "Profile").
- **Application submit was hard-failing (qa1)** — confirmed root cause: it inserted
  `status:'pending'`, but the real DB CHECK is `applications_status_check =
  applied|shortlisted|accepted|rejected`. Now inserts `'applied'`. *(This also corrects my
  earlier report: the code's `rejected` is correct; the **shared TS type**
  `pending|accepted|declined` is the thing that's wrong/stale.)*
- **Organizer now notified on new application (qa1)** — `sendNotification(type:
  'gig_application')` wired into the apply flow. Good.
- **`booking_status_changed` routing (qa1)** — `resolveLink` now maps it to
  `/bookings/<bookingId>`.
- **Status pills match real DB values (qa3)** — applications pill + musician
  `ApplicationsList` both handle `applied|shortlisted|accepted|rejected` (nice touch:
  "Not selected" label for `rejected`).
- **Booking `gig_id` link, dead "Cancelled" filter, avatar 404 (qa3)** — `bookings.gig_id`
  added + set on accept; gig↔booking lookup now by id; Cancelled filter matches the
  `canceled_by_*` values; all `/placeholder-avatar.png` fallbacks switched to the
  existing `/default-avatar.png`.
- **Comment correctness + bits clickable authors (qa1/qa2)** — feed `addComment` now
  checks `error`, keeps the modal open + toasts on failure, and guards double-submit;
  bits comment authors are now links.

### ⚠️ Fixed but incomplete

- 🆕 **N1 (S2, security) — the stored-XSS link fix is only half done.** qa4 added input
  sanitization (blocks `javascript:`/`data:`/`vbscript:` on save) and a `safeHref()` guard
  — **but `safeHref` was only added to `packages/ui/profile/PublicProfile.tsx`**, which the
  real profile pages don't use for social links. The actual render path is
  `SocialLink` (`packages/ui/components/SocialIcon.tsx`), which still does
  `href={href}` with **no scheme check**, and it's called by both
  `profile/[handle]/page.tsx` (musician + organizer). `whats-on/[venue]` and
  `venue/[handle]` also render `href={links.*}` raw. So **any pre-existing
  `javascript:`/`data:` link already in `profiles.links` still executes** when its profile
  is viewed. The commit comment even says the guard is meant to neutralize "pre-existing
  bad profile data" — but it's wired into the one component that path doesn't hit.
  **Fix:** sanitize the scheme inside `SocialLink` itself (and the venue/whats-on raw
  `href`s), since that's the real output path.

### ❌ Still open (not addressed by any commit)

- **Gig create — budget validation still truthiness-based + no past-date check**
  (`organizer/gigs/create/page.tsx`). `if (minN && maxN && minN > maxN)` still lets a max
  of `0` and negative values through, and `event_date` still accepts past dates. Unchanged.
- **Apply flow — no duplicate-application guard and no closed-gig guard**
  (`musician/gigs/[id]/apply/page.tsx`). You can still submit multiple applications to the
  same gig, and `/gigs/[id]/apply` is still reachable for closed/booked gigs. **[verify]**
  whether a DB unique index on `applications(gig_id, musician_id)` exists. Also a bad/
  missing gig id leaves the page stuck on "Loading application…" forever (the render guard
  is `if (!gig || !profile)`).
- **Organizer `chat/new` — still fragile.** No self-chat guard, no error toast on
  user-not-found / insert failure (infinite "Starting chat…"), `convo.id` used without a
  null check, and participants insert omits `role`. Unchanged.
- **Direct `book/[musicianId]` — still sets `organizer_name = organizerEmail`**, no field
  validation, and the button sticks on "Sending…" for the unauth early-return. Unchanged.

---

## B. New edge-case findings (round 4)

### 🆕 N2 (S2) — Profile media grid still renders a blank gray tile *(live)*
`/profile/naya` ("1 Posts") still shows the single post as an **empty gray square** — no
thumbnail, no "image unavailable" state. If `SafeImage` is degrading a broken media URL to
a blank placeholder, that's better than a broken-image icon but still reads as "broken" to
a user. **Fix:** verify the post's media URL/bucket; render a real fallback (icon + label)
instead of an empty box.

### 🆕 N3 (S2/S3) — People search matches only `display_name` *(live)*
Searching **"jazz"** on the People tab returns "No results", even though multiple jazz
musicians exist (Naya lists Jazz/Soul/Lounge). `searchPeople` only does
`ilike('display_name', …)`, so genre/instrument/bio searches fail from the main search box.
Most users expect "jazz" to surface jazz artists. **Fix:** also match `genres` (and maybe
`bio`/`location`) — e.g. an `.or()` across name + a `genres @> {term}` check, or surface the
genre filter more prominently.

### 🆕 N4 (S2) — Accounts operate with `display_name = email` (onboarding not enforced) *(live)*
My logged-in artist's **ARTIST NAME is literally `lokeshpatwa021996@gmail.com`**. That
email then shows as the author name on feed comments and as the applicant identity in the
gig application snapshot — so an organizer reviewing applicants sees one named
"lokeshpatwa021996@gmail.com". Root cause: signup seeds `display_name` from the email and
onboarding isn't enforced on the sign-in path (flagged in `QA_FINDINGS_DEEP.md`), so a user
can skip ever setting a name. **Fix:** require a display name at first run / before
applying, and never fall back to showing the raw email as a public name.

### 🆕 N5 (S3) — Apply page shows the wrong @handle *(live + code)*
On `/gigs/[id]/apply`, the applicant chip shows **`@lokeshpatwa021996@gmail.com`** even
though the real handle is `artist_00ejni`. The page derives the username from
`display_name?.toLowerCase().replace(/\s+/g,'')` instead of using `profile.handle`. So the
"@handle" is fabricated from the (email) display name and is both wrong and ugly.
**Fix:** render `@{profile.handle}`.

### 🆕 N6 (S4) — `shortlisted` is a dead status
The DB allows `shortlisted` and the pills render it, but no organizer UI ever sets it (the
application detail page only does Accept / Decline). Either add a "Shortlist" action or drop
the value to avoid an unreachable state.

### Carried-over **[verify]** items (need live DB/RLS)
- `bookings.status` accepts `'accepted'` (the accept flow writes it) — confirm the
  `bookings` CHECK constraint allows it, plus `pending`/`completed`/`canceled_by_*`.
- Unique index on `applications(gig_id, musician_id)` and on the
  `conversation_participants` pair.
- Whether `gigs`/`applications`/`bookings` RLS enforces `role` (the `RoleGuard` is
  client-side only).

---

## C. Live journeys exercised this round
Find → search (People/Gigs/Venues tabs, special-char query, debounce) → open gig
("Late Night Jazz Trio") → open apply page → empty-message validation (correctly blocked,
no write) · comment modal centering on the feed · public profile (Naya) media/nav/followers.

**No new test data created** this round (empty-message apply was blocked client-side; I did
not submit an application, follow, or post). The one leftover from round 3 — the "QA live
test comment — please ignore" on the pinned post — is still there (no delete-comment UI).

---

## D. Suggested priority
1. **N1** — finish the XSS guard in `SocialLink` (real output path; pre-existing bad links
   still execute).
2. **N4 / N5** — stop showing emails as names/handles; enforce a display name before a
   musician can apply (organizer-facing data quality).
3. **Still-open ❌** — gig-create budget/date validation, apply duplicate/closed guards,
   organizer `chat/new` hardening, direct-book name=email.
4. **N2 / N3** — blank media fallback, genre-aware people search.

---
*Method: `git` diff review of the fix commits + live browser automation on
`https://arteve.in` while authenticated. Organizer app remains blocked for live testing
(domain not in the browser tool's allowlist); its still-open items above are code-verified.*
