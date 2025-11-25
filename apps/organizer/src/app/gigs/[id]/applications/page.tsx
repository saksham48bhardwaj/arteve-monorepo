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

// Shape of rows returned from Supabase
type ApplicationRow = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  musician_id: string;
  musician?: {
    id: string;
    full_name: string | null;
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

      const mapped: Application[] = (data ?? []).map(row => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          message: row.message,
          status: row.status,
          created_at: row.created_at,
          musician_id: row.musician_id,
          musician_name: profile?.display_name ?? 'Unknown',
          musician_avatar_url: profile?.avatar_url ?? null,
        };
      });


      setApplications(mapped);
      setLoading(false);
    }

    loadApplications();
  }, [gigId]);

  const goToApplication = (applicationId: string) => {
    router.push(`/applications/${applicationId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold mb-2">Applications</h1>

      {loading && <p>Loading applications…</p>}

      {!loading && applications.length === 0 && (
        <p className="text-sm text-gray-500">No applications yet.</p>
      )}

      <div className="space-y-3">
        {applications.map((app) => (
          <button
            key={app.id}
            onClick={() => goToApplication(app.id)}
            className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <img
                src={app.musician_avatar_url ?? '/default-avatar.png'}
                alt={app.musician_name ?? 'Musician'}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium">
                  {app.musician_name ?? 'Unknown musician'}
                </p>
                {app.message && (
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {app.message}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(app.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <StatusBadge status={app.status} />
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const label =
    status === 'pending'
      ? 'Pending'
      : status === 'accepted'
      ? 'Accepted'
      : status === 'declined'
      ? 'Declined'
      : status;

  const colorClasses =
    status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : status === 'accepted'
      ? 'bg-green-100 text-green-800'
      : status === 'declined'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colorClasses}`}>
      {label}
    </span>
  );
}
