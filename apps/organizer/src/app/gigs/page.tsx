'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Button, Badge, EmptyState, Skeleton } from '@arteve/ui/components';

type GigStatus = 'open' | 'booked' | 'closed';
type Gig = {
  id: string;
  title: string;
  created_at: string;
  status: GigStatus;
  event_date: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
};

const FILTERS: { value: GigStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'booked', label: 'Booked' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_TONE: Record<GigStatus, 'success' | 'brand' | 'neutral'> = {
  open: 'success',
  booked: 'brand',
  closed: 'neutral',
};
const STATUS_LABEL: Record<GigStatus, string> = {
  open: 'Open',
  booked: 'Booked',
  closed: 'Closed',
};

function formatBudget(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  return null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  // Date-only strings must be parsed as LOCAL time; new Date('YYYY-MM-DD')
  // is UTC midnight and renders the previous day in western timezones.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ManageGigsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Gig[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<GigStatus | 'all'>('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('gigs')
        .select('id, title, created_at, status, event_date, location, budget_min, budget_max')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setRows(data as Gig[]);

        // Count applications per gig (parallel head queries)
        const counts = await Promise.all(
          (data as Gig[]).map(async (g) => {
            const { count } = await supabase
              .from('applications')
              .select('id', { count: 'exact', head: true })
              .eq('gig_id', g.id);
            return [g.id, count || 0] as const;
          }),
        );
        const map: Record<string, number> = {};
        counts.forEach(([id, c]) => { map[id] = c; });
        setAppCounts(map);
      }
      setLoading(false);
    })();
  }, [router]);

  const counts = useMemo(() => {
    const c = { open: 0, booked: 0, closed: 0, total: rows.length };
    rows.forEach((g) => {
      if (g.status === 'open') c.open += 1;
      else if (g.status === 'booked') c.booked += 1;
      else if (g.status === 'closed') c.closed += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return activeFilter === 'all' ? rows : rows.filter((g) => g.status === activeFilter);
  }, [rows, activeFilter]);

  if (loading) {
    return (
      <main className="w-full mx-auto pb-8" style={{ maxWidth: 720 }}>
        {/* Stats strip skeleton */}
        <section className="px-4 md:px-6 pt-4">
          <div className="grid grid-cols-3 rounded-xl border border-line bg-surface overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 text-center space-y-2">
                <Skeleton width="40%" height={22} className="mx-auto" />
                <Skeleton width="60%" height={11} className="mx-auto" />
              </div>
            ))}
          </div>
        </section>
        {/* Filter chips skeleton */}
        <div className="px-4 md:px-6 mt-4 flex gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={80} height={28} className="rounded-full shrink-0" />
          ))}
        </div>
        {/* Gig cards */}
        <div className="px-4 md:px-6 mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-padded space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton shape="circle" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton width="65%" height={16} />
                  <Skeleton width="40%" height={12} />
                </div>
                <Skeleton width={72} height={22} />
              </div>
              <Skeleton width="90%" height={12} />
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full mx-auto pb-8" style={{ maxWidth: 720 }}>
      {/* Stats summary */}
      <section className="px-4 md:px-6 pt-4">
        <div className="grid grid-cols-3 rounded-xl border border-line bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveFilter('open')}
            className={`px-4 py-3 text-center border-r border-line transition ${activeFilter === 'open' ? 'bg-success/10' : 'hover:bg-surface-sunken'}`}
          >
            <p className="text-xl font-bold text-ink-strong tabular leading-tight">{counts.open}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-muted mt-0.5">Open</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('booked')}
            className={`px-4 py-3 text-center border-r border-line transition ${activeFilter === 'booked' ? 'bg-brand-50' : 'hover:bg-surface-sunken'}`}
          >
            <p className="text-xl font-bold text-ink-strong tabular leading-tight">{counts.booked}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-muted mt-0.5">Booked</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('closed')}
            className={`px-4 py-3 text-center transition ${activeFilter === 'closed' ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'}`}
          >
            <p className="text-xl font-bold text-ink-strong tabular leading-tight">{counts.closed}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-muted mt-0.5">Closed</p>
          </button>
        </div>
      </section>

      {/* Filter pills + create */}
      <section className="px-4 md:px-6 pt-4 pb-3 flex items-center gap-2 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = activeFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveFilter(f.value)}
              className={`shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                active ? 'bg-brand text-white shadow-sm' : 'border border-line-strong text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1.5 text-[11px] tabular opacity-90">
                  {counts[f.value as GigStatus] ?? 0}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto shrink-0 flex items-center gap-2">
          <Link href="/find?tab=people" className="btn btn-outline btn-sm">
            Browse musicians
          </Link>
          <Link href="/gigs/create">
            <Button size="sm" variant="primary">+ New gig</Button>
          </Link>
        </div>
      </section>

      {/* Gig list */}
      {filtered.length === 0 ? (
        <div className="px-4 md:px-6 mt-4">
          <EmptyState
            title={activeFilter === 'all' ? 'No gigs yet' : `No ${activeFilter} gigs`}
            description={activeFilter === 'all'
              ? 'Post your first gig to start receiving applications from musicians.'
              : `You have ${counts.total} gig${counts.total === 1 ? '' : 's'}, but none are ${activeFilter}.`}
            action={
              <Link href="/gigs/create">
                <Button>Create a gig</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3 px-4 md:px-6">
          {filtered.map((g) => {
            const apps = appCounts[g.id] ?? 0;
            const budget = formatBudget(g.budget_min, g.budget_max);
            const date = formatDate(g.event_date);
            return (
              <li key={g.id}>
                <Link href={`/gigs/${g.id}/applications`} className="block card card-padded card-hover">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-semibold text-ink-strong leading-tight">{g.title}</h3>
                    <Badge tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                    {date && (
                      <span className="inline-flex items-center gap-1">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 3v4M15 3v4" />
                        </svg>
                        <span className="tabular">{date}</span>
                      </span>
                    )}
                    {g.location && (
                      <span className="inline-flex items-center gap-1">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14z" /><circle cx="12" cy="8" r="3" />
                        </svg>
                        {g.location}
                      </span>
                    )}
                    {budget && (
                      <span className="inline-flex items-center gap-1 tabular">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        {budget}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-muted">
                      <span className="text-ink-strong font-semibold tabular">{apps}</span> {apps === 1 ? 'application' : 'applications'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/gigs/${g.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-sunken px-2.5 py-1 transition"
                      >
                        Edit
                      </Link>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        Review
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
