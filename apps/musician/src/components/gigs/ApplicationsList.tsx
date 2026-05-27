'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { Badge, EmptyState, Spinner, Button } from '@arteve/ui/components';

type Status = 'applied' | 'shortlisted' | 'accepted' | 'rejected';
type Row = {
  id: string;
  created_at: string;
  status: Status;
  price_quote: number | null;
  gigs: {
    id: string;
    title: string;
    event_date: string | null;
    location: string | null;
    budget_min: number | null;
    budget_max: number | null;
  } | null;
};

const STATUS_TONE: Record<Status, 'neutral' | 'warning' | 'success' | 'danger'> = {
  applied: 'neutral',
  shortlisted: 'warning',
  accepted: 'success',
  rejected: 'danger',
};
const STATUS_LABEL: Record<Status, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Not selected',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

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
      .select('id, created_at, status, price_quote, gigs(id, title, event_date, location, budget_min, budget_max)')
      .order('created_at', { ascending: false });

    if (error) {
      setErr(error.message);
    } else {
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
    const channel = supabase
      .channel('apps-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-subtle py-4">
        <Spinner size={14} /> Loading applications…
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2 text-sm font-medium text-danger">
        {err}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Find gigs you're a fit for and send an application."
        action={
          <Link href="/find?tab=gigs"><Button>Find gigs</Button></Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((a) => (
        <li key={a.id}>
          <Link href={`/gigs/${a.gigs?.id ?? ''}`} className="block card card-padded card-hover">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-base font-semibold text-ink-strong leading-tight">
                {a.gigs?.title ?? 'Gig'}
              </h3>
              <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              {a.gigs?.location && (
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14z" /><circle cx="12" cy="8" r="3" />
                  </svg>
                  {a.gigs.location}
                </span>
              )}
              {a.gigs?.event_date && (
                <span className="inline-flex items-center gap-1 tabular">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 3v4M15 3v4" />
                  </svg>
                  {formatDate(a.gigs.event_date)}
                </span>
              )}
              {(a.price_quote ?? null) !== null && (
                <span className="inline-flex items-center gap-1 tabular">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Your quote: ${a.price_quote}
                </span>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-ink-subtle">
                Applied {formatDate(a.created_at)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                View gig
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
