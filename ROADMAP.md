# Arteve — Product Roadmap

**Mental model:** *Instagram × LinkedIn for live music* — connecting working
musicians and venues / event organizers. The current MVP covers profile,
feed, gigs, applications, bookings, chat. The features below are framed as
"what makes Arteve sticky and monetizable" — grouped by the user pain they
solve.

## A. The bookings flywheel — the actual business

This is what makes or breaks a marketplace. If a booking can complete
end-to-end on Arteve, you can take a cut. Everything else is engagement
plumbing.

### A1. Booking workflow with milestones (P0)
Today a booking is one row with one status. Real-world bookings have:
1. **Request** (organizer drafts an offer)
2. **Counter-offer** (musician proposes price / time changes)
3. **Confirm** (both sides accept terms)
4. **Deposit** (escrow optional)
5. **Showtime** (auto-transition on event_date)
6. **Payout** (escrow released)
7. **Reviews** (both sides)

Build this as an explicit state machine in the `bookings` table:
```
status  ∈ {requested, countered, confirmed, deposit_held, completed,
           cancelled, no_show, disputed}
```
+ a `booking_events` table that audits every state transition with actor +
timestamp. The current `pending → accepted` is too coarse.

### A2. Payments + escrow (P0 for revenue)
Wire Stripe Connect:
- Onboard musicians as Connected Accounts (Express).
- Organizer authorises a deposit at "Confirm".
- Release happens 24 h after the gig's `event_date` (cron edge function).
- 10% platform fee out of the gross. Show in the offer breakdown.

### A3. Calendar & availability (P1)
Add `availability` table: artists block days (single-day or recurring). On
the `/book/[musicianId]` page, hide blocked dates and show a small calendar
heatmap so organizers know when artists are likely free. Bonus: ICS feed
subscription per artist.

### A4. Riders + setlists per booking (P1)
- **Rider** = artist's contract requirements (sound system, green room, # of
  guests, etc.). Stored on the booking as JSON, surfaced on `/bookings/[id]`.
- **Setlist** = collaborative list of songs (artist proposes; organizer can
  request changes). Useful for weddings, corporate events.

### A5. Reviews after gig (P1)
Schema already has `reviews`. UI doesn't ask for them. Add an automatic
prompt 24 h after `event_date` on both sides: 1-5 stars + short comment +
the new "Would book again / Would play again" toggle. Reviews show on the
profile's About tab where we already render aggregates.

## B. Discovery — get more matches

### B1. Real recommendation algorithm (P0)
The Home "For You" feed and Find "Try searching for" are currently random.
Build a lightweight scoring SQL view:
- **For musicians:** rank gigs by genre overlap × city proximity × budget
  match × recency.
- **For organizers:** rank musicians by genre overlap × city × rating ×
  recent activity (posts in last 30 days).
Refresh hourly via a Postgres scheduled job. No ML needed for v1.

### B2. Structured genre taxonomy (P1)
`profiles.genres` is `text[]` free-form. Standardize on a `genres` table with
a curated list (~80 genres + aliases). Lets you do real "more like this".
Also lets organizers filter `Find` by exact genre.

### B3. Saved / Bookmarks (P1)
A `saves` join table per user. Bookmark a gig (musician), bookmark an artist
(organizer). New nav item on Find: "Saved". Common in every marketplace.

### B4. Map view of nearby gigs / venues (P2)
Mapbox or MapLibre. Pin gigs by `location` (geocode on insert). Especially
helpful for touring musicians.

### B5. "Featured" placements for paid organizers (P2)
After payments are live, organizers can boost a gig for $X to appear at the
top of Find. Same with artist profile boosts. Marketplace 101 monetization.

## C. Trust + safety — what gets users to commit

### C1. Verified badge (P0)
We already render the checkmark glyph. Wire it:
- `profiles.verified boolean` + `verified_at timestamptz`.
- Verification source: link an Instagram / Spotify with confirmed handle
  match, or manual review for venues.
- Show only on verified profiles.

### C2. ID verification for high-value bookings (P1)
For bookings > $X, require Stripe Identity check on both sides. Inserts a
`identity_check` record. Surface a "Verified ID" badge on the booking page.

### C3. Dispute resolution flow (P1)
If a gig goes sideways, either side can open a dispute on the booking. Funds
held in escrow are frozen until resolved. Build a simple admin dashboard for
you to triage these.

### C4. Reporting + blocks (P1)
Right now there's no "Report this profile" or "Block this user" button. Both
are required by every platform's terms of service.

## D. Content — keep people coming back

### D1. Stories / 24-hour bits (P1)
A `story` is a `bit` with a 24-hour TTL. Show the rounded-avatar story rail
above the feed (Instagram pattern). Cheap engagement multiplier.

### D2. Comments + replies on bits (P1)
Bits comments table exists, but no UI for **replies** to comments. Threading
1 deep is enough.

### D3. Hashtags (P1)
`#weddingband`, `#bombayindie`, etc. Tag posts/bits with hashtags and let
users tap to see all posts with that tag. Powers organic discovery.

### D4. Direct video / audio uploads with progress (P2)
Today uploads block the UI with a spinner. Switch to `resumable.js` or
Supabase's `upsert` with progress events; show a real progress bar.

### D5. Live audio rooms / sessions (P3)
Twitter Spaces / Clubhouse pattern for musicians to jam or demo. Big diff
vs. IG/LinkedIn but heavy lift — only after the booking flywheel is humming.

## E. Notifications — the retention loop

### E1. Email notifications (P0)
We have in-app notifications but no email. Critical for booking events
(received, accepted, declined, payout, reminder 24h before show). Use
Resend or Postmark + Supabase Edge Function triggered by the
`notifications` insert.

### E2. Web push (P1)
PWA is set up. Add Web Push subscription on home → store endpoint in
`push_subscriptions` table → fire from the same edge function that fires
emails.

### E3. Quiet hours + notification preferences (P1)
A `notification_settings` table per user with per-channel (email / push /
in-app) × per-type toggles. Don't ping people at 3am.

### E4. Digest mode (P2)
Bundle low-priority notifications into a daily / weekly digest email
("3 new applications, 1 new follower, 2 likes on your post").

## F. Onboarding — first-7-day retention

### F1. Profile completion wizard (P0)
After signup, run a 4-step wizard: avatar → bio + location → genres → first
post. Today the signup just dumps you on `/profile` half-empty. Empty
profiles never convert.

### F2. Sample data for new accounts (P1)
Show "this is what a great profile looks like" by linking to a curated
showcase artist on signup. Reduces "blank page" anxiety.

### F3. Two-tap connect with Spotify / Apple Music (P2)
"Import my discography" → auto-creates posts for top 5 tracks. Massive
profile bootstrap.

## G. Analytics — give users a reason to log in

### G1. Profile analytics for musicians (P1)
Tab on `/profile` showing: profile views (7d / 30d), post impressions,
follower growth, top gigs source ("23 organizers from Mumbai viewed you
this week"). LinkedIn's premium hook.

### G2. Gig analytics for organizers (P1)
Per-gig dashboard: views, click-through to apply, # of applications by city
/ genre, average ask price. Helps organizers calibrate budget on the next
post.

### G3. Anonymous benchmarks (P2)
"Artists in your genre + city typically charge $X for a Friday set." Pulled
from aggregate bookings. Stripe Atlas does this — extremely sticky.

## H. Org accounts — the SMB upsell

### H1. Multiple venues per organizer (P1)
Today a profile is a single venue. Booking agencies / venue groups need a
parent account with N venue children. Add `organizations` + `venues`.

### H2. Team seats on a venue (P2)
Multiple users can manage one venue (owner, booker, accountant). Wire role
permissions.

### H3. White-label option (P3)
Venue groups embed their gig listings on their own site via an iframe or
script tag. Stripe Atlas / Eventbrite move.

## I. Mobile-app feel improvements

### I1. Skeleton states everywhere (P1)
We have `<Skeleton>` but only use it in a few places. Every list / feed
should show skeletons not "Loading…" text.

### I2. Pull-to-refresh on feed + chat (P2)
Native-feeling. Use `react-spring` or a tiny custom hook.

### I3. Optimistic UI (P1)
Likes already feel optimistic on the home feed. Extend to comments, follows,
bookmarks.

### I4. Toast notifications (P0 — also in audit)
Already on the audit. Once shipped, use them for "Profile saved", "Gig
published", "Application sent".

## J. Admin + ops (boring but essential)

### J1. Internal admin console (P1)
A `/admin` route locked to your account that can: search any user, view
moderation reports, override bookings (refund / cancel), see system health
counters.

### J2. Audit log for sensitive actions (P1)
`audit_log` table for booking changes, payouts, deletions. Compliance
will need this.

### J3. Slack / Discord webhook for new signups + bookings (P1)
You currently have no visibility into platform activity. A simple webhook
from a Supabase Edge Function gives you real-time pulse.

---

## Suggested 90-day priority

| Phase | Weeks | Theme | Ships |
|------:|------:|:------|:------|
| **0** | 1 | Audit fixes | Sev-1 + Sev-2 from `AUDIT.md` — security, duplicates, toasts |
| **1** | 2-4 | Trust the loop | Booking state machine (A1) + reviews prompt (A5) + verified badge (C1) + email notifications (E1) |
| **2** | 5-8 | Money + Match | Stripe Connect + escrow (A2) + recommendation algorithm (B1) + onboarding wizard (F1) |
| **3** | 9-12 | Stickiness | Stories (D1) + saves/bookmarks (B3) + musician analytics (G1) + featured placements (B5) |

This gets you to a defensible product with revenue by month 3. Past that,
the multi-venue org features (H) and live audio (D5) become the path to
expansion.

---

## Post-R6 addendum (July 8, 2026) — reprioritized next steps

R6 shipped the quick wins (see `QA_FINDINGS_R6.md`). What it changed about
this roadmap, ranked by impact ÷ effort:

1. **Paste the token_hash auth email templates into the Supabase dashboard**
   (blocker, minutes of work — magic-link login is broken until then) and
   re-run the full loop test: apply → shortlist → accept → booking confirm.
2. **Public landing page for logged-out visitors** (new, high impact —
   arteve.in is currently a login wall; SEO metadata already in place, so a
   marketing page + public gig/venue pages compound fast).
3. **Quote field on the apply form** (small; the data model + organizer UI
   already display quotes — musicians just can't set one).
4. **Organizer dashboard metrics** on home (applications this week, open
   gigs, response rate) — the home feed is fine for discovery but organizers
   need a pulse (subset of G1/H1).
5. **A1 booking state machine** stays the top platform bet — R6's
   booking-notification fix papered over the pending→accepted coarseness,
   but counter-offers/completion still don't exist.
6. **E1 email notifications** rise in priority: R6 proved in-app
   notifications alone are missed (the booking request sat unseen).
