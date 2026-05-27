import Link from 'next/link';
import { LegalDocument, LEGAL_LAST_UPDATED } from './content';

interface Props {
  doc: LegalDocument;
  /** Sibling legal doc to cross-link to ("Privacy Policy" from /terms, etc.) */
  related?: { label: string; href: string };
}

export function LegalPage({ doc, related }: Props) {
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
          {doc.title}
        </h1>
        <p className="mt-1 text-xs text-ink-subtle uppercase tracking-[0.14em]">
          Last updated {new Date(LEGAL_LAST_UPDATED).toLocaleDateString(undefined, {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
        </p>
      </header>

      <p className="mt-6 text-[15px] leading-relaxed text-ink">
        {doc.intro}
      </p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
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

      {related && (
        <div className="mt-12 border-t border-line pt-6 text-sm text-ink-muted">
          See also: <Link href={related.href} className="text-ink-strong underline underline-offset-2">{related.label}</Link>
        </div>
      )}
    </main>
  );
}
