# Arteve — QA Round 5: Post-delete/media fixes + live full pass (June 7, 2026)

This round (a) root-caused and fixed the "image not showing + can't delete post" report,
(b) re-ran the live user-journey pass on **both** production apps (organizer was
browser-testable for the first time — the round-3 domain block is gone), and (c) ran the
backend criteria (Supabase security advisors, Sentry, RLS verification by simulated JWT).

Legend: ✅ verified fixed · 🆕 new finding · 📌 action for Sunny.

---

## A. The reported bugs — root cause & fixes (✅ live-verified)

### A.1 Image "was showing, now broken" on home/viewer but fine in profile grid
- **Root cause:** the post's storage object was missing from the `media` bucket while the
  `posts` row survived. The grid *looked* fine only because it renders through the Next
  image optimizer + PWA service worker (`StaleWhileRevalidate`, 7d), which kept serving a
  cached copy; the feed/viewer use direct `<img>` → 404.
- **Why rows orphan:** `deleteMedia` removed the storage file FIRST, then issued the DB
  delete, which silently matched **0 rows** (see A.2) — file gone, post kept.
- **Fixes (commit `685996c`):** delete DB row first and verify rowcount; storage cleanup
  last (best-effort); success/failure toasts; feeds (both apps) now render post images via
  `SafeImage` and `PostViewerModal` got a `ViewerImage` fallback, so a dead file renders a
  graceful "media unavailable" state instead of a broken image; the 2 orphaned rows
  (posts 23/24) were removed from the DB.

### A.2 Deleting a post "didn't work"
- **Root cause:** `posts` UPDATE/DELETE RLS policies checked `author_id`, but the apps
  insert rows with `profile_id` only (`author_id` NULL) → own-post deletes matched 0 rows
  with no error surfaced.
- **Fix (migration `0013`):** backfilled `author_id`, owner policies now accept either
  column, dropped the over-broad `posts_insert_authenticated` (was: any signed-in user can
  insert rows under any profile — impersonation), and scoped `media` uploads to the
  uploader's own folder (`{prefix}/{auth.uid()}/…`).
- **Live verification (production, as @sunny):** upload → publish → appears on home feed
  + profile grid → viewer renders → delete → toast "Post deleted", count 2→1, gone after
  reload; DB row and storage object both confirmed removed.

## B. New findings fixed this round

### B.1 🆕✅ Musician avatar upload was broken by RLS (S1)
`profile/edit` uploads avatars to the **avatars bucket** at `profiles/{uid}/…`, but the
bucket policies required the FIRST folder to be the uid → every avatar upload was
rejected. Migration `0014` accepts both layouts (`{uid}/…` and `profiles/{uid}/…`),
mirroring `0013`'s approach for the media bucket.

### B.2 🆕✅ Notification spoofing (S2, advisor `rls_policy_always_true`)
`notifs_insert_any` was `WITH CHECK (true)` — any signed-in user could insert
notifications as anyone. `sendNotification()` always stamps `actor_id = auth.uid()`, so
migration `0015` now requires it. Verified via simulated JWT: legit insert passes,
forged `actor_id` rejected.

### B.3 🆕✅ SECURITY DEFINER functions callable via `/rest/v1/rpc/*` (S2, lints 0028/0029)
`handle_new_user`, `protect_profile_verification`, `rls_auto_enable`,
`booking_messages_{insert,update}_compat` are trigger/vestigial functions; clients never
call them (only `rpc('whoami')` is used). Migration `0015` revokes EXECUTE from
anon/authenticated/public. `is_conversation_participant` intentionally stays callable —
RLS policies evaluate it as the calling role.

## C. Live pass results (production, June 7)

**Musician (arteve.in):** home feed (For You) ✅ · featured bits strip ✅ · post create
with real file upload ✅ (exercises new storage RLS) · post viewer own/other ✅ (delete
button only on own) · post delete ✅ · like + optimistic count ✅ · comments modal
centered/portaled ✅ · find + genre-aware search ("jazz") ✅ · public profile ✅ · chat
list + conversation ✅ · notifications list, unread badge 9→8 on click ✅ · notification
deep-link to a *deleted* post lands on home gracefully (no crash) ✅ · gigs/applications
("Shortlisted" status) ✅ · console: no app errors (only Chrome-extension noise).

**Organizer (organizer.arteve.in) — first live pass:** home/discover feed ✅ (SafeImage) ·
venue profile + photo gallery viewer ✅ · gigs empty state + filters ✅ · find ✅ ·
console clean. Gig→application→booking pipeline unchanged this round (validated in R4).

**Sentry:** 0 unresolved issues, both projects. **Vercel:** both deploys READY.

## D. Open items 📌 (Sunny's call — not code)

1. **Venue photo leaks secrets (S1, data not code).** Test Avenue's single public venue
   photo is a screenshot of the Vercel *environment-variables* page (Sentry auth token,
   service-role key rows visible, truncated). It's publicly served from the media bucket:
   `venue-photos/018c2c52-…/1780341580730-….png`. Recommend deleting that photo from the
   organizer profile (or I can remove it on request) and rotating the Sentry auth token +
   Supabase service-role key if the full values ever appeared on screen.
2. **Enable leaked-password protection** (advisor): Supabase Dashboard → Auth →
   passwords — one toggle, no code.
3. Advisor WARNs left as-is, deliberate for a social app: public-bucket listing
   (media/avatars), GraphQL schema visibility for anon/authenticated (row access is still
   policy-gated). Documented so nobody chases ghosts in R6.
4. The original wipe of `profiles/2a40630c/…` files predates 24h log retention; with the
   RLS + ordering fixes the orphaning mechanism is closed (deletes can no longer
   half-succeed), but the trigger for the June-1 file's disappearance remains unattributed.
