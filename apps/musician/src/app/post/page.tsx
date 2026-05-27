'use client';

import Link from 'next/link';

type Tile = {
  href: string;
  title: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  accent: string; // CSS gradient
};

const TILES: Tile[] = [
  {
    href: '/post/new',
    title: 'Post',
    description: 'Share a photo, video, or audio clip to your profile grid.',
    badge: 'Most common',
    accent: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5-9 9" />
      </svg>
    ),
  },
  {
    href: '/bits/new',
    title: 'Bit',
    description: 'Short vertical clip that plays in the Reels-style viewer.',
    accent: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function PostHub() {
  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      {/* Top bar — own back since TopNav is hidden on /post */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Back"
            className="inline-flex h-9 w-9 -ml-1 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-ink-strong">Create</h1>
        </div>
      </header>

      <div className="px-4 md:px-6 pt-6 pb-10">
        <div className="mb-6">
          <p className="page-title !text-xl md:!text-2xl">What would you like to share?</p>
          <p className="page-subtitle">Pick a format. You can change it later by deleting and re-uploading.</p>
        </div>

        {/* Tiles */}
        <div className="grid sm:grid-cols-2 gap-3">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="card card-padded card-hover group relative overflow-hidden"
            >
              {/* Background flourish */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 transition group-hover:opacity-30 group-hover:scale-110"
                style={{ background: t.accent }}
              />
              <div className="relative flex items-start gap-4">
                <span
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: t.accent }}
                >
                  {t.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-ink-strong">{t.title}</h3>
                    {t.badge && <span className="badge badge-brand">{t.badge}</span>}
                  </div>
                  <p className="text-sm text-ink-muted mt-1 leading-relaxed">{t.description}</p>
                </div>
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-subtle group-hover:text-ink transition" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Tips */}
        <section className="mt-8 rounded-xl border border-line bg-surface-sunken px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Tips</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink-disabled shrink-0" />
              Vertical 9:16 video looks best in Bits.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink-disabled shrink-0" />
              Captions help organizers find you in search — mention the genre or instrument.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink-disabled shrink-0" />
              Anything you upload also shows on your profile grid.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
