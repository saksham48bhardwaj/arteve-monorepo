# Arteve — QA Round 6: Full-app audit, live pass + fixes (July 8, 2026)

Live audit of both apps (musician desktop + 375 px, organizer desktop) plus a
code sweep. Every fix below is implemented in this commit unless marked
**action needed**. Typecheck clean on both apps (`tsc --noEmit`).

---

## A. S1 — Magic-link sign-in is broken end-to-end (both apps)

**Symptom (reproduced 3× live):** request a magic link → open it →
`/auth/callback` fails with the raw error *"PKCE code verifier not found in
storage."* No user can complete a magic-link login.

**Diagnosis (instrumented live):**
- `signInWithOtp` **does** write the `sb-…-code-verifier` cookie at request time.
- The verifier is later deleted before the exchange: any stale/revoked
  `sb-…-auth-token` cookie makes the SDK run its session cleanup, which
  removes the pending verifier with it. A revoked-session cookie was
  reliably present because of the sign-out bug in §B.
- Even without that, the PKCE round-trip breaks whenever the link is opened
  in a different browser/app than the one that requested it — which is the
  *normal* case on mobile (Gmail app → in-app browser).

**Fix shipped (repo):** all four auth email templates (`emails/*.html`) now
link straight to the app callback with a token hash instead of the PKCE
verify URL:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink   (02)
…&type=signup (01) · …&type=recovery&next=/reset-password (03) · …&type=email_change (04)
```

`/auth/callback` already supports this path (`verifyOtp({ token_hash, type })`),
works cross-browser, and needs no local verifier.

**⚠️ Action needed (Sunny):** paste the four updated templates into
**Supabase Dashboard → Auth → Emails** (same place as the R5 branded
templates). Until then, magic links stay broken in production.

Also shipped: `auth-errors.ts` now maps PKCE/OTP errors to human copy
("This sign-in link couldn't be verified — it usually means the link was
opened in a different browser…") instead of leaking SDK internals.

## B. S1/S2 — "Sign out" logged the user out of *everything*

`supabase.auth.signOut()` defaults to **global** scope. Every plain sign-out
(logout button, role-guard bounce, reset-password cleanup, account page) was
revoking *all* of the user's sessions — including the other Arteve app and
other devices. Live-confirmed: being bounced from the organizer app killed
the musician session on arteve.in.

**Fixed:** all 8 call sites now use `signOut({ scope: 'local' })`. "Sign out
everywhere" on the Account page keeps `scope: 'global'` — now it actually
means something.

## C. S2 bugs found live and fixed

| # | Bug | Fix |
|---|-----|-----|
| C1 | **Chat threads open at the oldest message** whenever the history overflows (all 6 chat pages; smooth `scrollIntoView` is flaky mid-mount) | Container-scoped `scrollTo` — instant jump on first paint, smooth for new messages |
| C2 | **No way to browse open gigs** — "Find gigs" landed on an empty search box; gigs only reachable via text search | `/find?tab=gigs` now lists all open gigs with no query (browse mode); same for organizer `/find?tab=people` (talent pool) + "Browse musicians" button on /gigs |
| C3 | **Past gigs still accept applications** (Late Night Jazz Trio, dated Jun 20, had a live Apply button on Jul 8) | Gig page + apply page gate on `isPastDate(event_date)`; find results hide past-dated gigs |
| C4 | **Date-only timezone bug** — gig created for Aug 15 renders "Aug 14" (`new Date('YYYY-MM-DD')` = UTC midnight) | Swept all 15 render sites to parse `T00:00:00` local; added shared `utils/date.ts` |
| C5 | **Organizer bookings list shows "Unknown" musician** — to-one embed read as array (`row.musician?.[0]`) | Accepts both shapes; also `$400 – $400` now collapses to `$400` |
| C6 | **Booking requests send no notification to the musician** — they'd only find out by checking their bookings tab | `/book` now sends `booking_created` with a `/bookings/{id}` deep link |
| C7 | **Organizer login logo was a white slab** — `arteve_logo.png` had a solid white background, so `brightness-0 invert` produced a rectangle | Re-processed the PNG (un-composited from white, now 73 % transparent); hero scrim strengthened for headline contrast |
| C8 | **DB hardening (advisor lints)** — public buckets allowed full listing; `is_conversation_participant` executable by `anon` | Migration `0016` applied to prod + committed (apps never call `.list()`, verified) |

## D. S3 fixes shipped

- **Skill level was free text** — live data literally said "Expe" (fixed the
  row to "Expert" live). Edit-profile now uses a Beginner/Intermediate/
  Advanced/Expert dropdown.
- **Notification copy duplicated names** ("Rhea Kapoor Rhea Kapoor
  commented") — stored titles that start with the actor's name are stripped;
  verb-phrase fallbacks per type; body hidden when it repeats the title.
- **Avatar broken-image fallback** — `Avatar` now degrades src → default
  image → initials (Rooftop Sessions showed the browser's broken-img alt
  text in chat + inbox).
- **Gig pages leaked internal UUIDs** ("Gig ID: aaaa1111…") — removed on
  both apps; `event_time` now renders "9:30 PM" instead of "21:30:00".
- **Feed posts had no timestamps** — relative time ("5m", "3h", "2d",
  "May 21") on every post card in both apps.
- **Comments UX was split across two modals** (read-only list vs separate
  composer) — the "view all comments" modal now has an inline composer, new
  comments append live; modal title "Comments on Aria Mehta" → "Comments".
- **Messages screen had no compose button** — "New message" header action on
  both apps.
- **Apply-form validation was gray text** — now `role="alert"` in danger
  styling.
- **/login ignored an existing session** — both login pages now redirect
  already-authenticated users with the right role.
- **Organizer find had no debounce** — was one PostgREST query per
  keystroke; now 280 ms, same as musician.

## E. Live pass notes (what works well)

Feed (like/comment/counters), search across all five categories with genre
matching, gig creation (validation, live genre chips, helper copy), chat
(typing indicators, read receipts, presence, date dividers, Enter-to-send),
notifications grouping/unread filter, account management (email change,
password, sessions), bits viewer, profile completeness nudge, PWA manifest.
Mobile layout at 375 px is solid: bottom tab bar, single column, proper
back-headers. Organizer empty states are genuinely good ("No conversations
yet → Find people").

**Data cleanup from this round:** test gig "QA Acoustic Evening (test)"
(open, Aug 15) and one pending test booking "QA Booking - Acoustic Evening
(test)" (Test Avenue → Saksham). Decline/close or keep for the loop test.

## F. Not fixed this round (top of next backlog)

1. **Full loop test blocked at applicant review** — my musician session died
   to bug §B mid-test and magic-link login is §A-broken; once templates are
   pasted, run: apply → shortlist → accept → booking confirm. (Password
   login works meanwhile.)
2. **No public landing page** — logged-out arteve.in is a login wall. Big
   SEO/growth gap; metadata is already excellent.
3. **Quote field missing from the apply form** — applications display "Your
   quote: $450" but the form never asks for one.
4. **Achievements have no add-CTA from the profile About tab** (edit page
   only).
5. **Organizer home is a discovery feed, not a dashboard** — no
   applications/bookings/views metrics.
6. **People search results show no matching context** (genre chips would
   explain *why* a result matched).
7. Signup/onboarding flows untested live this round (rounds 4–5 covered
   them; re-test after the template change since confirm-signup emails now
   use token_hash too).
