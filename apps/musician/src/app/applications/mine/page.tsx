'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Row = {
  id: string;                 // application id
  created_at: string;
  status: 'applied'|'shortlisted'|'accepted'|'rejected';
  price_quote: number | null;
  gigs: {
    id: string;
    title: string;
    event_date: string | null;
    location: string | null;
  } | null;
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Join applications -> gigs for context
    const { data, error } = await supabase
      .from('applications')
      .select('id,created_at,status,price_quote,gigs(id,title,event_date,location)')
      .order('created_at', { ascending: false });

    if (error) setErr(error.message);
    else {
    const normalized = (data ?? []).map((d) => ({
      ...d,
      gigs: Array.isArray(d.gigs) ? d.gigs[0] ?? null : d.gigs, // pick the first related gig
    })) as Row[];
    setRows(normalized);
}
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // OPTIONAL: realtime updates when organizer changes a status
  useEffect(() => {
    const channel = supabase.channel('apps-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'applications'
      }, (payload) => {
        // simple refresh on any change; you could be smarter and patch-in
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">My Applications</h1>

      {rows.length === 0 && (
        <p className="text-gray-600">You haven’t applied to any gigs yet.</p>
      )}

      <div className="space-y-3">
        {rows.map((a) => (
          <a key={a.id} href={`/gigs/${a.gigs?.id}`} className="block rounded-2xl border p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{a.gigs?.title ?? 'Gig'}</div>
                <div className="text-sm text-gray-600">
                  {(a.gigs?.location ?? '—')} · {(a.gigs?.event_date ?? 'TBD')}
                </div>
              </div>
              <a href={`/chat/${a.id}`} className="text-blue-600 underline text-xs ml-2">Message</a>

              <div className="text-right">
                {a.price_quote != null && <div className="text-sm font-medium">${a.price_quote}</div>}
                <span className="text-xs text-gray-500">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <StatusPill status={a.status} />
            </div>
          </a>
        ))}
      </div>

      {err && <p className="text-red-600">{err}</p>}
    </main>
  );
}

function StatusPill({ status }: { status: Row['status'] }) {
  const styles: Record<Row['status'], string> = {
    applied:     'bg-gray-100 text-gray-800 border-gray-200',
    shortlisted: 'bg-amber-100 text-amber-900 border-amber-200',
    accepted:    'bg-green-100 text-green-900 border-green-200',
    rejected:    'bg-red-100 text-red-900 border-red-200',
  };
  const labels: Record<Row['status'], string> = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
