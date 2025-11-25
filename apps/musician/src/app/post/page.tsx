export default function PostHub() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Create</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <a href="/post/new" className="rounded-2xl border p-6 hover:bg-gray-50">
          <div className="text-lg font-medium">New Post</div>
          <p className="text-sm text-gray-600">Share a photo/video with a caption.</p>
        </a>
        <a href="/bits/new" className="rounded-2xl border p-6 hover:bg-gray-50">
          <div className="text-lg font-medium">New Bit</div>
          <p className="text-sm text-gray-600">Upload a short vertical clip.</p>
        </a>
      </div>

      <p className="text-sm text-gray-500">
        (We’ll hook these into Supabase Storage next—this is the entry point to reduce friction.)
      </p>
    </section>
  );
}
