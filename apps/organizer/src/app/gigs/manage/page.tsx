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

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Gigs</h1>
        <Link className="px-3 py-2 border rounded" href="/gigs/create">Create gig</Link>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-gray-600">No gigs yet.</p>}
        {rows.map((g)=>(
          <Link key={g.id} href={`/gigs/${g.id}/applications`} className="block rounded-2xl border p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{g.title}</div>
                <div className="text-sm text-gray-600">
                  {g.location || '—'} · {g.event_date || 'TBD'} · {g.status}
                </div>
              </div>
              <span className="text-sm text-gray-500">{new Date(g.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
