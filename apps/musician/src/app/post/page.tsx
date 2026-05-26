'use client';

import Link from 'next/link';

export default function PostHub() {
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="text-sm text-ink-subtle mt-1">
          Share your talent with high-quality posts and short bits.
        </p>
      </header>

      {/* CREATE OPTIONS */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/post/new"
          className="rounded-2xl border border-line p-6 bg-surface hover:bg-surface-sunken transition shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-medium">New Post</h2>
            <p className="text-sm text-ink-muted">
              Upload a photo or video with an optional caption. Appears in your profile media grid.
            </p>
          </div>
        </Link>

        <Link
          href="/bits/new"
          className="rounded-2xl border border-line p-6 bg-surface hover:bg-surface-sunken transition shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-medium">New Bit</h2>
            <p className="text-sm text-ink-muted">
              Share a short vertical clip. Great for highlights and quick performances.
            </p>
          </div>
        </Link>
      </section>

      {/* INFO NOTE */}
      <p className="text-xs text-ink-subtle">
        Your uploaded media instantly appears on your profile’s Media section.
      </p>
    </main>
  );
}
