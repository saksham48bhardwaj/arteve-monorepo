# Arteve — Go-Live & Monetization Plan

_Prepared June 13, 2026, after QA rounds 1–5b. Status of the product, an honest
readiness verdict, and the exact, ordered steps to ship to real users and turn it
into a profitable business._

> I'm not a lawyer or a financial advisor — the legal, tax, and payment items below
> are the general steps a marketplace like this needs, not legal/financial advice.
> Confirm specifics with a Canadian lawyer and an accountant before you take payments.

---

## 1. Honest readiness verdict

**Is the app technically ready to put in front of real users? — Yes, as a free product / beta**, once you clear the four "launch-blockers" in §2. After five QA rounds the two apps are functionally complete and stable, the database has row-level security on all 19 tables with every write path owner-scoped (verified by simulated logins), there are zero unresolved Sentry errors, and every core flow — signup, profiles, feed, posts, bits, search, gigs, applications, bookings, chat, notifications, reviews, account deletion — works live.

**Can it "start making profit" today? — No, not yet.** There is **no payment system in the product**. The booking flow connects a musician and an organizer and lets them message, but no money changes hands inside Arteve — your own Terms say _"When payments are introduced, they will be handled by a third-party processor."_ So "profit" is a second milestone that requires building the payment layer (§4). This is the single biggest gap between where you are and a revenue-generating business.

Think of it as two launches:

- **Launch A (weeks):** free beta → real users, real bookings arranged off-platform, you learn what people actually do. Clears §2 + §3.
- **Launch B (the money):** add payments + take a cut → revenue. §4 onward.

---

## 2. Launch-blockers — do these before ANY public traffic

These are small but genuinely block a public launch.

1. **Rotate the exposed secrets and delete the leaking image.** A venue test photo currently public in the `media` bucket is a screenshot of your Vercel environment-variables page showing the Sentry auth token and Supabase service-role key rows. Before public traffic: delete that photo (organizer "Test Avenue" profile, or I can remove the storage object), then **rotate** the Supabase `service_role` key and the Sentry auth token in case the full values were ever visible. Treat any key that appeared on screen as compromised.
2. **Enable leaked-password protection.** Supabase Dashboard → Authentication → Policies/Passwords → turn on "Check against HaveIBeenPwned." One toggle (flagged by the security advisor).
3. **Confirm auth redirect URLs for both domains.** Supabase → Authentication → URL Configuration: Site URL + redirect allow-list must include `https://arteve.in/auth/callback`, `https://organizer.arteve.in/auth/callback`, and the reset-password URLs. A wrong list silently breaks email confirmation / magic links / password reset in production.
4. **Fix the support-email domain mismatch.** The Privacy page points to `privacy@arteve.app`, but your live domain is `arteve.in`. Stand up real, monitored inboxes (`privacy@`, `support@`, `hello@arteve.in`) and correct the legal copy. You need a working contact address for app-store/legal/abuse anyway.

---

## 3. Pre-launch hardening (the rest of "ship it as a free beta")

4. **Get the Terms + Privacy Policy reviewed by a lawyer.** You have solid drafts (9 sections each), but you're operating a marketplace based in Canada (Toronto/Ottawa) that stores PII, hosts user messaging, and will soon move money. A lawyer should confirm PIPEDA/CASL compliance, the liability disclaimer, and the dispute/cancellation terms. Add a real business entity (sole prop or incorporation) as the contracting party.
5. **Add content moderation + reporting.** Right now users can post media and DM each other with no in-app "Report" / "Block" path. Before opening to strangers, add: report on posts/profiles/messages, block-user, and a takedown/ban workflow for you. Add a DMCA/abuse contact. This is both a trust-and-safety and a legal-exposure issue for any UGC platform.
6. **Confirm an age gate.** Your Terms set a minimum age — enforce it at signup (a date-of-birth or "I'm 16+" check) and keep the platform free of content involving minors. Note this in onboarding.
7. **Turn on database backups / point-in-time recovery.** Supabase PITR is a paid-tier feature — enable it so a bad migration or accidental delete is recoverable. (Your repo's commit workaround and the earlier orphaned-media incident are exactly why this matters.)
8. **Verify monitoring is recording in prod.** Sentry and PostHog are wired in code. Confirm the prod env vars (`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`) are set on both Vercel projects, then set a Sentry alert (email/Slack on new issue) and build one PostHog funnel (signup → profile complete → first post / first application).
9. **(Optional, boosts signup) Finish Google OAuth.** The "Continue with Google" button is gated off behind `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`. Create a Google Cloud OAuth client, add it in Supabase → Auth → Providers, set the env var to `true`. Social login meaningfully lifts signup conversion.
10. **Rate-limiting / abuse.** Supabase has basic auth rate limits; confirm they're on. Consider a simple per-user cap on posts/messages to blunt spam at launch.

When §2 + §3 are done, you can responsibly invite real users to a free beta.

---

## 4. Build the money layer (required to "make profit")

This is net-new development — the biggest item on this page. For a two-sided
booking marketplace the standard is **Stripe Connect** (it handles paying the
platform _and_ paying out the musicians, plus KYC/tax).

11. **Create a Stripe account** (Stripe is fully supported in Canada, settles in CAD).
12. **Stripe Connect (Express) for musician payouts.** Each musician completes Stripe's hosted onboarding once (identity + bank). Stripe handles KYC and 1099/T4A-style tax reporting so you don't hold that liability.
13. **Booking checkout.** When an organizer confirms a booking, collect payment up front (full amount, or a deposit). Use Stripe's **destination charges / `application_fee_amount`** so your platform fee is taken automatically and the rest is routed to the musician's connected account.
14. **Escrow-style hold + release.** Hold funds (manual capture or delayed payout) and release to the musician when the gig is marked `completed` — you already have that booking status. Define a cancellation/refund policy (e.g., full refund up to N days before the event).
15. **Webhooks → DB.** A Supabase Edge Function receives Stripe webhooks (`payment_intent.succeeded`, `account.updated`, `charge.refunded`) and updates booking/payment rows. (You already deploy edge functions — `delete-account` exists — so the pattern is in place.)
16. **Receipts, refunds, disputes, tax.** Turn on Stripe Tax for GST/HST, enable email receipts, and build an admin path for refunds and dispute evidence.
17. **(v2) Subscriptions.** Once transactions flow, add Stripe Billing for "Pro" tiers (see §5) — recurring revenue that isn't tied to booking volume.

**Test plan:** build entirely in Stripe **test mode**, run 5–10 fake bookings through deposit → completion → payout → refund, _then_ flip to live keys.

---

## 5. How Arteve makes money (pick your model)

Recommended: start with a **booking service fee**, layer subscriptions later.

- **Booking service fee (primary).** Take **10–15%** of each booking as an application fee via Connect. Charge the organizer, the musician, or split. This is the cleanest fit for what you've built and scales with GMV. _Example: 12% on a $400 booking = $48 to Arteve._
- **Musician Pro subscription** (~$8–12/mo): more media slots, featured placement in search/feed, analytics, verified badge (you already have a `verified` flag).
- **Organizer/Venue Pro** (~$20–40/mo): unlimited gig posts, applicant filtering, priority support.
- **Featured / promoted listings:** one-off paid boosts for a gig or a profile in `/find` and the bits strip.
- **Avoid at first:** charging before there's liquidity. Free until both sides see value; introduce the fee once bookings are actually happening.

**Rough unit economics:** profit per booking ≈ (fee % × booking value) − Stripe fees (~2.9% + C$0.30) − a few cents infra. At 12% on a $400 booking you net roughly **$36** after Stripe. Your job pre-profitability is to maximize **completed bookings/month** in one city; revenue follows almost automatically once payments are in.

---

## 6. Seed the marketplace, then launch (sequence matters)

Marketplaces die from the "empty restaurant" problem — solve supply first.

18. **Pick one city: Toronto** (you're there; both test venues are ON). Don't launch nationally.
19. **Seed supply (musicians) first.** Hand-recruit 20–50 local musicians to build real profiles (photos, bits, genres). A feed/`/find` that's already populated is what makes venues stay.
20. **Then invite demand (venues/organizers):** 5–15 local venues, cafés, event planners. Personally onboard them and help post their first gig.
21. **Closed beta (2–4 weeks).** Invite-only. Run real gigs end-to-end. If payments are live, start in Stripe test then switch a few real bookings to live. Watch the PostHog funnel and Sentry daily; fix friction.
22. **Public launch (one city).** Open signups. Launch channels: local musician Facebook/WhatsApp groups, Instagram/TikTok of the bits, university music programs, an Indie Hackers / Product Hunt post, a short press note to local-music blogs. Lead with the bits — short video is your most shareable surface.
23. **Expand city-by-city** only after one city shows repeat bookings.

---

## 7. Operate & grow

24. **Support:** monitored `support@arteve.in`, a basic FAQ/help page, a feedback button.
25. **Weekly metrics:** signups by role, profile-completion rate, posts/bits created, applications sent, **bookings completed** (your north-star), and once live, GMV + take. PostHog already captures the funnel events.
26. **Trust & safety:** review reports, watch for off-platform-payment leakage (people trying to dodge the fee in chat), enforce Terms.
27. **Iterate** on the highest drop-off in the funnel; keep the supply/demand ratio healthy per city.

---

## 8. Suggested timeline

| Phase | Work | Rough time |
|---|---|---|
| **Now → this week** | §2 launch-blockers + §3 items 8–10 | 2–4 days |
| **Week 1–2** | §3 legal review, moderation/report, backups, age gate | ~1–2 weeks (legal in parallel) |
| **Week 2–5** | §4 Stripe Connect payments (the big build) + test | 2–4 weeks |
| **Week 4–6** | §6 seed Toronto supply, then demand | overlap with build |
| **Week 6–8** | Closed beta → public launch (Toronto) | 2–4 weeks |

You can run **Launch A (free beta in Toronto)** as soon as §2–§3 are done — you don't have to wait for payments to start gathering real users and bookings. Add payments in parallel and switch on monetization once there's booking activity to monetize.

---

## 9. What I already did this round (so you don't re-do it)

- **Fixed:** the image-not-showing + can't-delete-post bug (RLS owner-column mismatch + delete ordering + orphaned rows) and broken-media fallbacks — shipped & live-verified in R5.
- **Hardened DB:** notification-spoofing policy, scoped media/avatar upload paths, revoked public EXECUTE on internal functions — migrations `0013`–`0015`, applied to prod, advisor-confirmed cleared.
- **This round (5b):** full route/link inventory (orphan routes are intentional redirect stubs, not dead links); every write-path RLS policy verified owner-scoped via simulated JWT; application/booking/gig status vocabulary cross-checked against DB check constraints (consistent — no silent-fail); both booking entry points validated; 404, password-recovery, and deep-link missing-data states confirmed; replaced the last native `confirm()` dialogs with an in-app modal (shipped & live).
- **Remaining known low-severity items (documented, deliberately not changed pre-launch):** storage buckets allow listing (filenames are non-secret; tightening risks breaking image serving — revisit post-launch), and `is_conversation_participant` is intentionally callable because RLS policies depend on it.
