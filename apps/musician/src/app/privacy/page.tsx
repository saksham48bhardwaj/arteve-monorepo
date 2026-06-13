import Link from 'next/link';

export const metadata = { title: 'Privacy Policy · Arteve' };

const LAST_UPDATED = 'May 27, 2026';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: '1. Information we collect',
    body: [
      'Account information you provide: email address, display name, handle, profile bio, location, links, and uploaded media.',
      'Activity information: posts, bits, applications, bookings, messages, follows, likes, comments, and notification preferences.',
      'Technical information: IP address, device type, browser, and basic usage metrics needed to keep the service running and secure.',
    ],
  },
  {
    heading: '2. How we use it',
    body: [
      'To provide and improve the product — show your profile to people who would book you, deliver messages, send notifications.',
      'To keep the platform safe — prevent fraud, abuse, and spam.',
      'To communicate with you about your account, bookings, and important changes to the service.',
    ],
  },
  {
    heading: '3. Sharing',
    body: [
      'Profile information you have made public is visible to other Arteve users so they can find and book you.',
      'We use trusted infrastructure providers (Supabase for data storage and authentication, Vercel for hosting) which process your data on our behalf under their own privacy commitments.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: '4. Cookies and storage',
    body: [
      'Arteve uses cookies and local browser storage only as needed to keep you signed in and to remember your preferences. We do not use third-party advertising cookies.',
    ],
  },
  {
    heading: '5. Your controls',
    body: [
      'You can edit or delete most of your profile information from the Profile page at any time.',
      'You can change your password and email, and delete your account, from the Account settings page.',
      'When you delete your account we remove or anonymize your personal information, except where retention is required by law.',
    ],
  },
  {
    heading: '6. Data security',
    body: [
      'We use industry-standard practices to protect your data, including encryption in transit, row-level security in the database, and regular audits.',
    ],
  },
  {
    heading: '7. Children',
    body: [
      'Arteve is not directed to children under 16. If you become aware that a child has provided us with personal information, please contact us so we can delete it.',
    ],
  },
  {
    heading: '8. Changes',
    body: [
      'We will post updates to this policy on this page and update the "Last updated" date. Material changes will be communicated by email or in-product notice.',
    ],
  },
  {
    heading: '9. Contact',
    body: [
      'For privacy questions or requests, contact privacy@arteve.in.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="w-full mx-auto px-4 sm:px-6 py-8 sm:py-12" style={{ maxWidth: 720 }}>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Home
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight text-ink-strong">
          Privacy Policy
        </h1>
        <p className="mt-1 text-xs text-ink-subtle uppercase tracking-[0.14em]">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <p className="mt-6 text-[15px] leading-relaxed text-ink">
        This policy explains what information Arteve collects, how we use it, and the controls
        you have. We collect only what we need to run the product and to keep your account safe.
      </p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-ink-strong">{s.heading}</h2>
            <div className="mt-2 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-ink">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-6 text-sm text-ink-muted">
        See also: <Link href="/terms" className="text-ink-strong underline underline-offset-2">Terms of Use</Link>
      </div>
    </main>
  );
}
