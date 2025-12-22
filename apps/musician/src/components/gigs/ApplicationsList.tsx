'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Row = {
  id: string;
  created_at: string;
  status: 'applied' | 'shortlisted' | 'accepted' | 'rejected';
  price_quote: number | null;
  gigs: {
    id: string;
    title: string;
    event_date: string | null;
    location: string | null;
  } | null;
};

export default function ApplicationsList() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data, error } = await supabase
      .from('applications')
      .select('id,created_at,status,price_quote,gigs(id,title,event_date,location)')
      .order('created_at', { ascending: false });

    if (error) setErr(error.message);
    else {
      const normalized = (data ?? []).map((d) => ({
        ...d,
        gigs: Array.isArray(d.gigs) ? d.gigs[0] ?? null : d.gigs,
      })) as Row[];
      setRows(normalized);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase.channel('apps-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'applications'
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading applications…</p>;

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">You haven’t applied to any gigs yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((a) => (
        <a
          key={a.id}
          href={`/gigs/${a.gigs?.id}`}
          className="block rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
        >
          <div className="flex justify-between gap-4">
            <div>
              <div className="font-medium">{a.gigs?.title ?? 'Gig'}</div>
              <div className="text-sm text-slate-500">
                {(a.gigs?.location ?? '—')} · {(a.gigs?.event_date ?? 'TBD')}
              </div>
            </div>

            <span className="text-xs">
              <StatusPill status={a.status} />
            </span>
          </div>
        </a>
      ))}

      {err && <p className="text-red-600">{err}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: Row['status'] }) {
  const styles = {
    applied: 'bg-slate-100 text-slate-700',
    shortlisted: 'bg-amber-100 text-amber-900',
    accepted: 'bg-green-100 text-green-900',
    rejected: 'bg-red-100 text-red-900',
  }[status];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${styles}`}>
      {status}
    </span>
  );
}
