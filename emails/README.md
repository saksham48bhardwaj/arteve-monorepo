# Arteve transactional emails

Branded, email-client-safe HTML for the auth emails Supabase sends. Table-based
layout with inline styles (works in Gmail, Apple Mail, Outlook, mobile). Brand
colors #4E7FA2 / #E8BB92, serif wordmark, warm-stone palette.

## Files → where they go

Supabase Dashboard → **Authentication → Email Templates**. Paste each file's HTML
into the matching template and set the Subject line:

| File | Supabase template | Subject |
|---|---|---|
| `01-confirm-signup.html` | Confirm signup | Welcome to Arteve — confirm your email |
| `02-magic-link.html` | Magic Link | Your Arteve sign-in link |
| `03-reset-password.html` | Reset Password | Reset your Arteve password |
| `04-change-email.html` | Change Email Address | Confirm your new email for Arteve |
| `05-reauthentication.html` | Reauthentication | Your Arteve verification code |

One Supabase project serves both apps. The `{{ .ConfirmationURL }}` already points
back to whichever app (arteve.in or organizer.arteve.in) the user came from, so a
single set of templates covers both.

## Before these look right in production

1. **Set the address.** Footer says "Toronto, ON, Canada" — CASL/CAN-SPAM require a
   real physical mailing address on commercial email. Put your registered address in
   each footer (find-and-replace once).
2. **`support@arteve.in` must exist.** Stand up the inbox so the help link works.
3. **Set the auth URL configuration (required — these templates use the `token_hash`
   pattern).** The links resolve `{{ .RedirectTo }}` to the client-supplied redirect,
   which must be on the allow-list or Supabase silently falls back to the Site URL and
   the links break. In Supabase → Authentication → URL Configuration:
   - **Site URL:** `https://arteve.in`
   - **Redirect URLs (add all):** `https://arteve.in/auth/callback`,
     `https://arteve.in/reset-password`, `https://organizer.arteve.in/auth/callback`,
     `https://organizer.arteve.in/reset-password`, plus `http://localhost:3000/**` for dev.
   The app already sends the right redirect per flow (signup/magic-link → `/auth/callback`,
   recovery → `/reset-password`) and consumes `token_hash` in both `/auth/callback` and
   `/reset-password`, so once the allow-list is set the whole loop works.
4. **Production deliverability needs custom SMTP.** Supabase's built-in email sender
   is rate-limited (a few per hour) and meant for testing — at launch volume,
   confirmation emails will silently fail. Connect a real sender:
   - Pick a provider: **Resend** (simplest), Postmark, or Amazon SES.
   - Verify your domain (SPF + DKIM DNS records) so mail isn't marked spam.
   - Supabase → Project Settings → Auth → SMTP Settings → enter the provider's host,
     port, user, pass, and a `from` like `Arteve <hello@arteve.in>`.
   - The templates above are unchanged — they work the same over custom SMTP.

## Notes

- Web fonts don't load in most email clients, so the body uses a system sans stack
  and the wordmark/headings use Georgia (serif) to echo the Fraunces display font.
- Remote images are blocked by default in many clients, so the design uses **no
  images** — the wordmark and brand stripe are pure HTML/CSS and always render.
- These templates use the **`token_hash` pattern** — links are built as
  `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=…` (not the default
  `{{ .ConfirmationURL }}`). This is deliberate: it routes through the app's own
  `/auth/callback` and `/reset-password` handlers, which is what fixed the earlier
  broken-magic-link issue. Other variables used: `{{ .Token }}` (reauth code),
  `{{ .Email }}`, `{{ .NewEmail }}`.
- Always send yourself a test of each (Supabase shows a "send test email" option, or
  trigger the real flow) and check it on mobile + Gmail + one Outlook/desktop client.
