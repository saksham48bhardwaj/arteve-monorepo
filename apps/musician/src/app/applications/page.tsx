'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Status = 'pending' | 'accepted' | 'rejected';

type Row = {
  id: string;
  created_at: string;
  status: Status;
  message: string | null;
  gigs: {
    id: string;
    title: string;
    event_date: string | null;
    location: string | null;
  } | null;
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        message,
        created_at,
        gig:gig_id (
          id,
          title,
          event_date,
          location
        )
      `)
      .eq('musician_id', user.id)
      .order('created_at', { ascending: false }) as {
        data: {
          id: string;
          status: Status;
          message: string | null;
          created_at: string;
          gig: {
            id: string;
            title: string;
            event_date: string | null;
            location: string | null;
          } | null;
        }[] | null;
        error: Error | null;
      };

    if (error) {
      setErr(error.message);
    } else {
      const normalized = (data ?? []).map((d) => ({
        id: d.id,
        created_at: d.created_at,
        status: d.status,
        message: d.message ?? null,
        gigs: d.gig ?? null,
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
      }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8 bg-white">
      <h1 className="text-3xl font-semibold tracking-tight">My Applications</h1>

      {rows.length === 0 && (
        <p className="text-gray-600 text-sm">
          You haven’t applied to any gigs yet.
        </p>
      )}

      <div className="space-y-4">
        {rows.map((a) => (
          <button
            key={a.id}
            onClick={() => router.push(`/gigs/${a.gigs?.id}`)}
            className="w-full text-left rounded-3xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition p-6 space-y-3"
          >
            {/* Title + Status */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {a.gigs?.title ?? 'Gig'}
              </h2>
              <StatusPill status={a.status} />
            </div>

            {/* Location + Date */}
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>{a.gigs?.location ?? '—'}</p>
              <p>
                {a.gigs?.event_date
                  ? new Date(a.gigs.event_date).toLocaleDateString()
                  : 'Date TBD'}
              </p>
            </div>

            {/* Applied date */}
            <p className="text-xs text-gray-400">
              Applied on{' '}
              {new Date(a.created_at).toLocaleDateString()}
            </p>

            {/* View indicator */}
            <div className="flex justify-end pt-1">
              <span className="text-xs text-blue-600 font-medium">
                View gig →
              </span>
            </div>
          </button>
        ))}
      </div>

      {err && <p className="text-red-600">{err}</p>}
    </main>
  );
}

function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    pending: 'bg-gray-100 text-gray-800 border-gray-200',
    accepted: 'bg-green-100 text-green-900 border-green-200',
    rejected: 'bg-red-100 text-red-900 border-red-200',
  };

  const labels: Record<Status, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
