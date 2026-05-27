import Link from 'next/link';

export const metadata = { title: 'Terms of Use · Arteve' };

const LAST_UPDATED = 'May 27, 2026';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: '1. Eligibility',
    body: [
      'You must be at least 18 years old, or the legal age of majority where you live, to use Arteve.',
      'You must provide accurate, current information when creating your account, and keep it up to date.',
    ],
  },
  {
    heading: '2. Accounts and security',
    body: [
      'You are responsible for activity that happens under your account, including any bookings, posts, or messages you send.',
      'Keep your password confidential. If you suspect your account has been compromised, change your password immediately and contact us.',
      'One person should only operate one account. Creating multiple accounts to evade limits or moderation is not allowed.',
    ],
  },
  {
    heading: '3. Content you post',
    body: [
      'You retain ownership of the media, performances, and text you post on Arteve.',
      'By posting, you grant Arteve a worldwide, non-exclusive, royalty-free license to host, display, distribute, and promote that content within the product and in related marketing.',
      'You must have the rights to everything you upload. Do not upload material you did not create unless you have permission.',
    ],
  },
  {
    heading: '4. Acceptable use',
    body: [
      'Do not use Arteve to harass, threaten, impersonate, or defraud other users.',
      'Do not upload content that is unlawful, hateful, sexually explicit involving minors, or that infringes intellectual property.',
      'Do not interfere with the operation of the platform, including scraping, reverse engineering, or attempting to bypass rate limits.',
    ],
  },
  {
    heading: '5. Bookings and payments',
    body: [
      'Arteve facilitates connections between musicians and organizers but is not a party to bookings made between them, unless explicitly stated.',
      'When payments are introduced, they will be handled by a third-party processor under separate terms which you will accept at that time.',
    ],
  },
  {
    heading: '6. Termination',
    body: [
      'You may delete your account at any time from the Account settings page. Deletion is permanent.',
      'We may suspend or terminate accounts that violate these terms, or where required by law.',
    ],
  },
  {
    heading: '7. Disclaimer and limitation of liability',
    body: [
      'Arteve is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Arteve and its team are not liable for indirect or consequential damages arising from use of the service.',
    ],
  },
  {
    heading: '8. Changes to these terms',
    body: [
      'We may update these terms from time to time. We will notify users of material changes by email or in-product notice before they take effect.',
    ],
  },
  {
    heading: '9. Contact',
    body: [
      'Questions about these terms can be sent to hello@arteve.app.',
    ],
  },
];

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="mt-1 text-xs text-ink-subtle uppercase tracking-[0.14em]">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <p className="mt-6 text-[15px] leading-relaxed text-ink">
        Welcome to Arteve. These terms describe the rules for using the Arteve platform
        (&quot;Arteve&quot;, &quot;we&quot;, &quot;us&quot;) and our musician and organizer apps.
        By creating an account or using the service you agree to be bound by these terms.
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
        See also: <Link href="/privacy" className="text-ink-strong underline underline-offset-2">Privacy Policy</Link>
      </div>
    </main>
  );
}
