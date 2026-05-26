'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Gig = {
  id: string;
  title: string;
  created_at: string;
  status: 'open'|'closed'|'booked';
  event_date: string | null;
  location: string | null;
};

export default function ManageGigsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data, error } = await supabase
        .from('gigs')
        .select('id,title,created_at,status,event_date,location')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setRows(data as Gig[]);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return (
    <main className="page page-narrow">
      <div className="card card-padded flex items-center gap-3"><span className="inline-block h-4 w-4 rounded-full border-2 border-brand border-r-transparent animate-spin" /><p className="text-sm text-ink-muted">Loading…</p></div>
    </main>
  );

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Gigs</h1>
        <Link className="px-3 py-2 border rounded border-line" href="/gigs/create">Create gig</Link>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-ink-muted">No gigs yet.</p>}
        {rows.map((g)=>(
          <Link key={g.id} href={`/gigs/${g.id}/applications`} className="block rounded-2xl border p-4 hover:bg-surface-sunken border-line">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{g.title}</div>
                <div className="text-sm text-ink-muted">
                  {g.location || '—'} · {g.event_date || 'TBD'} · {g.status}
                </div>
              </div>
              <span className="text-sm text-ink-subtle">{new Date(g.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
