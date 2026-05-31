# Arteve — Live UI Test (Round 3, May 31, 2026)

This round drove the **actual production app** in a real browser (Claude in Chrome),
logged in as Saksham Bhardwaj, exercising real interactions: liking, commenting, opening
profiles from comments, viewing followers, navigating, and checking layout/console.
Findings here are **observed live**, not inferred from code. Severity inline.

> **Organizer app (`organizer.arteve.in`) could NOT be tested live** — the browser tool
> is hard-blocked on that domain for *every* action: `navigate` returns "Navigation to
> this domain is not allowed", and even after the user manually navigated the connected
> tab there, `screenshot`/`read_page` return "Permission denied for this action on this
> domain". This is a tooling/allowlist restriction in this session, not a fixable app
> setting. The organizer app is therefore covered only by the code-level reports
> (`QA_FINDINGS.md`, `QA_FINDINGS_DEEP.md`), which already document its create-gig,
> applications, bookings, chat, and profile bugs in detail. To get a live organizer pass,
> the domain would need to be added to the browser tool's allowlist.

---

## Verified bugs (musician app, live)

### UI-1 (S2) — Comment modals are not centered to the viewport
Clicking **Comment** (compose) or **View all N comments** on a post does **not** show a
centered dialog. The dialog renders at the *post's position in the document* with a weak
/ missing backdrop, so on any post taller than the viewport (i.e. most image posts) the
click appears to do nothing — you have to scroll down the page to find the dialog floating
beside the post. Reproduced on multiple posts.
- **Contrast that proves it:** the **Followers** modal (which uses the shared
  `@arteve/ui` `Modal`) opens perfectly centered with a proper dim backdrop. So the feed's
  *custom inline* comment modals (`musician/src/app/page.tsx`) are the problem — they're
  not using the shared fixed/centered `Modal`.
- **Impact:** users think commenting is broken.
- **Fix:** render both feed comment modals through the shared `Modal` component (fixed,
  viewport-centered, backdrop), as the followers/following modal already does.

### UI-2 (S2) — Profile media grid shows a blank gray tile
On a musician's public profile (`/profile/naya`, "1 Posts"), the Media tab renders one
grid tile as an **empty gray box** — the post's image never appears. Either the media URL
is broken or the raw `<img>` never loads/has no fallback.
- **Fix:** verify the stored media URL/bucket visibility; add a fallback/skeleton and use
  `next/image` so a failed load is visible/handled rather than a silent gray square.

### UI-3 (S2/S3) — `/find` never finishes loading (page never goes idle)
Navigating to `/find` leaves the page in a perpetually "busy" state: every
script/DOM/screenshot operation times out after 45 s waiting for `document_idle`, while
`/` (Home) settles normally. Something on Find keeps the main thread or network
continuously active (a hanging request, an always-running animation, or a render loop).
- **Impact:** on a real device this is a spinner that may never resolve and a hot main
  thread (battery/jank).
- **Fix:** profile the Find route's mount — check for an unresolved fetch, a
  `setInterval`, or an always-animating element; ensure the initial state settles.
  **[verify]**

### UI-4 (S3) — Commenting throws you back to the top of the feed
After submitting a comment, the composer calls a full **feed refresh** (`refreshFeed()`),
which reloads page 1 and **resets the scroll position**. You lose your place and get
bounced up the feed — jarring if you were deep in the timeline.
- **Fix:** update just the affected post's comment list/count in place instead of
  refetching and re-rendering the whole feed.

### UI-5 (S3) — Feed post images have no max-height
A tall image post (e.g. the pinned Arteve promo) fills the entire card at full height,
pushing the like/comment action row **far below the fold** — you scroll a full screen
past the image before you can like or comment. The feed needs a `max-height` + `object-fit`
cap on post media (Instagram caps at ~4:5).

### UI-6 (S4) — Left-nav active state wrong on others' profiles
While viewing another user's public profile (`/profile/naya`), the sidebar still
highlights **Profile** (your own). The active nav item should clear (or none should be
active) when you're on someone else's profile.

---

## Verified working (live) — don't worry about these

- **Like / unlike** — optimistic heart fill + count update is instant and correct
  (1 → 2 → 1).
- **Comment submit (happy path)** — the comment *does* persist (no silent failure in the
  normal case); the count increments.
- **Open profile from a comment** — works from the "view all comments" modal
  (→ `/profile/<handle>`); the public profile loads with posts/followers/following, bio,
  genres, Message/Follow, Media/About tabs.
- **Followers modal** — opens centered with backdrop, lists followers with @handles and
  Follow buttons; cross-role follows render fine (a venue following a musician).
- **No console errors** were captured on Home during these flows.

---

## Couldn't verify live (tooling limits)

- **True mobile responsiveness** — `resize_window` to 390 px didn't actually narrow the
  CSS viewport (Chrome clamps the min window width and the capture stays desktop-res), so
  the mobile breakpoints / `BottomNav` couldn't be screenshotted. Rely on the code-level
  responsive review (`QA_FINDINGS_DEEP.md` §7) until this can be tested on a device or via
  devtools device emulation.
- **Bits comments not linkable** — confirmed in code (`QA_FINDINGS_DEEP.md` 2.2); not
  re-driven live this round.
- **Entire organizer app** — blocked by domain allowlist (see note at top).

---

## Test data created on production (please clean up if unwanted)
- Liked then unliked Saksham Bhardwaj's "hey" post (net zero).
- One comment posted on Saksham Bhardwaj's own post: *"QA live test comment — please
  ignore."* — left in place (no delete-comment UI exists in the feed, which is itself a
  small gap worth noting).

---
*Method: live browser automation against `https://arteve.in` while authenticated.
Combine with the two code-level reports for full coverage. Re-run on
`organizer.arteve.in` once the domain is approved.*
