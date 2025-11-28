'use client';

import Link from 'next/link';

export default function PostHub() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="text-sm text-gray-500 mt-1">
          Share your talent with high-quality posts and short bits.
        </p>
      </header>

      {/* CREATE OPTIONS */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/post/new"
          className="rounded-2xl border border-gray-200 p-6 bg-white hover:bg-gray-50 transition shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-medium">New Post</h2>
            <p className="text-sm text-gray-600">
              Upload a photo or video with an optional caption. Appears in your profile media grid.
            </p>
          </div>
        </Link>

        <Link
          href="/bits/new"
          className="rounded-2xl border border-gray-200 p-6 bg-white hover:bg-gray-50 transition shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-medium">New Bit</h2>
            <p className="text-sm text-gray-600">
              Share a short vertical clip. Great for highlights and quick performances.
            </p>
          </div>
        </Link>
      </section>

      {/* INFO NOTE */}
      <p className="text-xs text-gray-500">
        Your uploaded media instantly appears on your profile’s Media section.
      </p>
    </main>
  );
}
