'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Application = {
  id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | string;
  created_at: string;
  musician_id: string;
  musician_name: string | null;
  musician_avatar_url: string | null;
};

// Supabase row shape
type ApplicationRow = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  musician_id: string;
  profiles?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[] | {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function GigApplicationsPage() {
  const params = useParams<{ id: string }>();
  const gigId = params.id;
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      if (!gigId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          message,
          status,
          created_at,
          musician_id,
          profiles:profiles!applications_musician_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading applications:', error);
        setLoading(false);
        return;
      }

      const parsed: Application[] = (data ?? []).map((row: ApplicationRow) => {
        const profile = Array.isArray(row.profiles)
          ? row.profiles[0]
          : row.profiles;

        return {
          id: row.id,
          message: row.message,
          status: row.status,
          created_at: row.created_at,
          musician_id: row.musician_id,
          musician_name: profile?.display_name ?? 'Unknown musician',
          musician_avatar_url: profile?.avatar_url ?? null
        };
      });

      setApplications(parsed);
      setLoading(false);
    }

    loadApplications();
  }, [gigId]);

  const goToApplication = (applicationId: string) => {
    router.push(`/applications/${applicationId}`);
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="text-sm text-ink-muted">
          Review applications submitted to this gig.
        </p>
      </header>

      {loading && <p className="text-ink-muted">Loading applications…</p>}

      {!loading && applications.length === 0 && (
        <p className="text-sm text-ink-subtle">No applications yet.</p>
      )}

      {/* Application cards */}
      <div className="space-y-4">
        {applications.map((app) => (
          <div
            key={app.id}
            onClick={() => goToApplication(app.id)}
            className="rounded-3xl border border-line bg-surface shadow-sm px-5 py-4 flex items-center justify-between gap-4 hover:bg-surface-sunken transition cursor-pointer"
          >
            {/* Left side */}
            <div className="flex items-center gap-4">
              <img
                src={app.musician_avatar_url ?? '/default-avatar.png'}
                alt={app.musician_name ?? 'Musician'}
                className="w-12 h-12 rounded-full object-cover border border-line"
              />

              <div className="space-y-0.5">
                <p className="font-medium text-sm md:text-base text-ink-strong">
                  {app.musician_name}
                </p>

                {app.message && (
                  <p className="text-xs md:text-sm text-ink-subtle line-clamp-1">
                    {app.message}
                  </p>
                )}

                <p className="text-[11px] text-ink-subtle">
                  Applied {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Right side */}
            <StatusPill status={app.status} />
          </div>
        ))}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: Application['status'] }) {
  const base =
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border';

  // DB values (applications_status_check): applied | shortlisted | accepted | rejected.
  const map: Record<string, string> = {
    applied: `${base} bg-warning/5 text-warning border-warning/30`,
    pending: `${base} bg-warning/5 text-warning border-warning/30`,
    shortlisted: `${base} bg-brand-50 text-brand-700 border-brand-200`,
    accepted: `${base} bg-success/5 text-success border-success/30`,
    rejected: `${base} bg-danger/5 text-danger border-danger/30`,
    declined: `${base} bg-danger/5 text-danger border-danger/30`,
  };

  const labels: Record<string, string> = {
    applied: 'Applied',
    pending: 'Pending',
    shortlisted: 'Shortlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
    declined: 'Declined',
  };

  const classes = map[status] ?? `${base} bg-surface-sunken text-ink border-line`;
  const label = labels[status] ?? status;

  return <span className={classes}>{label}</span>;
}
